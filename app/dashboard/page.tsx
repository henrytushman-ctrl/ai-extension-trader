"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Circle, ExternalLink, PauseCircle, PlayCircle, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  connectWithApiKey,
  getStrategyMeta,
  getUserAccount,
  getSubscriptions,
  createSubscription,
  pauseSubscription,
  deleteSubscription,
  getTrades,
  shortModel,
} from "@/lib/api";
import { Suspense } from "react";


type BackendSub = {
  id: number;
  strategy: string;
  model: string;
  active: boolean;
  created_at: string;
  stock_universe?: string;
  aggression?: string;
  is_custom?: boolean;
};

type Trade = {
  id: number;
  ticker: string;
  action: string;
  shares: number;
  price: number;
  reasoning: string;
  executed_at: string;
  alpaca_order_id: string | null;
};

function nextFridayET(): string {
  const now = new Date();
  const dow = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "America/New_York" })
    .format(now);
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(dow);
  const daysUntilFriday = (5 - dayIndex + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(next.getDate() + daysUntilFriday);
  return next.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "America/New_York" });
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<number | null>(null);
  const [sessionToken, setSessionToken] = useState<string>("");
  const [alpacaEnv, setAlpacaEnv] = useState<"paper" | "live">("paper");
  const [account, setAccount] = useState<Record<string, string> | null>(null);
  const [subscription, setSubscription] = useState<BackendSub | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [connectSlow, setConnectSlow] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [pendingEnv, setPendingEnv] = useState<"paper" | "live">("paper");
  const [connectError, setConnectError] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState("");
  const [removing, setRemoving] = useState(false);

  const strategyParam = searchParams.get("strategy");
  const modelParam = searchParams.get("model") ?? "claude-haiku-4-5-20251001";

  useEffect(() => {
    const storedUserId = localStorage.getItem("aiet_user_id");
    const storedEnv = localStorage.getItem("aiet_env") as "paper" | "live" | null;
    const storedToken = localStorage.getItem("aiet_session_token") ?? "";
    if (!storedUserId || !storedToken) return;
    const uid = Number(storedUserId);
    if (storedEnv) setAlpacaEnv(storedEnv);

    // Validate session before trusting localStorage
    getUserAccount(uid, storedToken).then(acct => {
      if (!acct) {
        // Session is invalid — clear and force reconnect
        localStorage.removeItem("aiet_user_id");
        localStorage.removeItem("aiet_env");
        localStorage.removeItem("aiet_session_token");
        return;
      }
      setUserId(uid);
      setSessionToken(storedToken);
      setAccount(acct);
      getSubscriptions(uid, storedToken).then((subs: BackendSub[]) => {
        setSubscription(subs.find(s => s.active) ?? null);
      });
      getTrades(uid, storedToken).then((t: Trade[]) => setTrades(t));
    });
  }, []);

  async function handleConnect() {
    if (!apiKey.trim() || !apiSecret.trim()) return;
    setConnecting(true);
    setConnectSlow(false);
    setConnectError("");
    const slowTimer = setTimeout(() => setConnectSlow(true), 4000);
    try {
      const data = await connectWithApiKey(apiKey.trim(), apiSecret.trim(), pendingEnv);
      clearTimeout(slowTimer);
      localStorage.setItem("aiet_user_id", String(data.user_id));
      localStorage.setItem("aiet_env", data.environment);
      localStorage.setItem("aiet_session_token", data.session_token);
      setUserId(data.user_id);
      setSessionToken(data.session_token);
      setAlpacaEnv(data.environment as "paper" | "live");
      setApiKey("");
      setApiSecret("");
      getUserAccount(data.user_id, data.session_token).then(acct => { if (acct) setAccount(acct); });
      getSubscriptions(data.user_id, data.session_token).then((subs: BackendSub[]) => {
        setSubscription(subs.find(s => s.active) ?? null);
      });
    } catch (e) {
      clearTimeout(slowTimer);
      setConnectError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setConnecting(false);
      setConnectSlow(false);
    }
  }

  function handleDisconnect() {
    localStorage.removeItem("aiet_user_id");
    localStorage.removeItem("aiet_env");
    localStorage.removeItem("aiet_session_token");
    setUserId(null);
    setSessionToken("");
    setAccount(null);
    setSubscription(null);
    setTrades([]);
  }

  async function handleDeploy(strategyKey: string) {
    if (!userId || !sessionToken) return;
    setDeploying(true);
    setDeployError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/users/${userId}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": sessionToken },
        body: JSON.stringify({ strategy: strategyKey, model: modelParam }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Deploy failed");
      setSubscription(data);
    } catch (e) {
      setDeployError(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  }

  async function handleToggle() {
    if (!subscription || !userId || !sessionToken) return;
    const updated = await pauseSubscription(userId, subscription.id, !subscription.active, sessionToken);
    setSubscription(updated);
  }

  async function handleRemove() {
    if (!subscription || !userId || !sessionToken) return;
    setRemoving(true);
    try {
      await deleteSubscription(userId, subscription.id, sessionToken);
      setSubscription(null);
    } finally {
      setRemoving(false);
    }
  }

  const connected = !!userId && !!sessionToken;
  const meta = subscription ? getStrategyMeta(subscription.strategy) : null;
  const nextExecution = nextFridayET();

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
                Enter your Alpaca API key and secret. We encrypt and store them to execute trades on your behalf.
                Generate keys at <a href="https://app.alpaca.markets" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">app.alpaca.markets</a>.
              </p>

              {/* Paper / Live toggle */}
              <div className="flex gap-2">
                {(["paper", "live"] as const).map(env => (
                  <button
                    key={env}
                    onClick={() => setPendingEnv(env)}
                    className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                      pendingEnv === env
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {env === "paper" ? "Paper account" : "Live account"}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="API Key (e.g. PKBKRI32BJBH6O7T6C4DL66DC3)"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  type="password"
                  placeholder="API Secret"
                  value={apiSecret}
                  onChange={e => setApiSecret(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleConnect()}
                  className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <Button
                onClick={handleConnect}
                disabled={connecting || !apiKey.trim() || !apiSecret.trim()}
                className="w-full"
              >
                {connecting ? "Verifying…" : `Connect ${pendingEnv === "paper" ? "Paper" : "Live"} Account`}
              </Button>

              {connectSlow && (
                <p className="text-xs text-muted-foreground">Server is waking up — this can take up to 30 seconds…</p>
              )}
              {connectError && (
                <p className="text-xs text-red-400">{connectError}</p>
              )}
              {!connectError && !connectSlow && (
                <p className="text-xs text-muted-foreground">Start with paper trading to test before using real money.</p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  Connected — {alpacaEnv === "paper" ? "Paper account" : "Live account"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Alpaca API key ·{" "}
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
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Pick a proven strategy from the marketplace, or build your own with full control over every parameter.
              </p>
              {strategyParam ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border border-border rounded-md p-3">
                    <div>
                      <p className="text-sm font-medium capitalize">{getStrategyMeta(strategyParam).label}</p>
                      <p className="text-xs text-muted-foreground">{getStrategyMeta(strategyParam).description}</p>
                    </div>
                    <Button size="sm" onClick={() => handleDeploy(strategyParam)} disabled={deploying}>
                      {deploying ? "Deploying…" : "Deploy"}
                    </Button>
                  </div>
                  {deployError && <p className="text-xs text-red-400">{deployError}</p>}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  <Link href="/strategies">
                    <Button variant="outline" size="sm" className="w-full">
                      Browse proven strategies →
                    </Button>
                  </Link>
                  <Link href="/dashboard/custom">
                    <Button size="sm" className="w-full">
                      Build custom strategy →
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{meta?.label}</span>
                    <Badge variant={subscription.active ? "default" : "secondary"} className="text-xs">
                      {subscription.active ? "Active" : "Paused"}
                    </Badge>
                    {subscription.is_custom && (
                      <Badge variant="secondary" className="text-xs">Custom</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{meta?.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Model: {shortModel(subscription.model)} · Executes Fridays 4:30pm ET
                  </p>
                  {subscription.is_custom && (
                    <p className="text-xs text-muted-foreground">
                      Universe: {subscription.stock_universe} · Risk: {subscription.aggression}
                    </p>
                  )}
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

              <div className="rounded-md bg-card border border-border px-4 py-3 text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground text-xs">Next execution</p>
                <p className="text-xs">{nextExecution} · 4:30pm ET</p>
                <p className="text-xs">The AI will review your {alpacaEnv} portfolio and submit trade decisions to Alpaca.</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Link href="/strategies" className="flex-1 min-w-[140px]">
                  <Button variant="outline" size="sm" className="w-full">Browse strategies</Button>
                </Link>
                <Link href="/dashboard/custom" className="flex-1 min-w-[140px]">
                  <Button variant="outline" size="sm" className="w-full">Build custom</Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={handleRemove}
                  disabled={removing}
                >
                  {removing ? "Removing…" : "Remove"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Trade history */}
      <Card className={!subscription ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {trades.length > 0
              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
              : <Circle className="w-4 h-4 text-muted-foreground" />}
            Step 3 — Trade history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No trades yet. First execution runs {nextExecution} at 4:30pm ET.
            </p>
          ) : (
            <div className="space-y-2">
              {trades.map(trade => (
                <div key={trade.id} className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-sm">{trade.ticker}</span>
                      <Badge
                        variant="secondary"
                        className={`text-xs capitalize ${
                          trade.action === "buy" || trade.action === "cover"
                            ? "text-green-400"
                            : trade.action === "sell" || trade.action === "short"
                            ? "text-red-400"
                            : ""
                        }`}
                      >
                        {trade.action}
                      </Badge>
                    </div>
                    {trade.reasoning && (
                      <p className="text-xs text-muted-foreground leading-relaxed truncate max-w-xs">{trade.reasoning}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-sm font-mono">{trade.shares.toFixed(0)} @ ${trade.price.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(trade.executed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
    <main className="flex-1">
      <Suspense>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
