import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HowItWorksPage() {
  return (
    <main className="flex-1">
      <div className="p-6 max-w-2xl mx-auto w-full space-y-10 pb-16">
        <div>
          <h1 className="text-xl font-bold">How it works</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI Extension Trader is the consumer layer on top of a live controlled experiment.
          </p>
        </div>

        {[
          {
            title: "The experiment behind it",
            body: `Since April 13, 2026, we've been running 726 AI trading agents simultaneously in paper accounts, each with $100,000 in starting capital. Each agent uses a different combination of strategy (value, momentum, growth, mean reversion, sentiment, macro, dividend), AI model (Claude Haiku, GPT-4o-mini, Gemini Flash 2), and data diet (prices only, with news, with financial ratios). Every Friday at 4:30pm ET, each agent reviews its portfolio and submits trade decisions via structured tool calls. No free-text parsing — pure structured output. The experiment runs for 52 weeks. All hypotheses were pre-registered on April 13, 2026.`,
          },
          {
            title: "How your account connects",
            body: `You authorize AI Extension Trader to trade on your Alpaca account via Alpaca's standard OAuth 2.0 flow. We receive an access token scoped to order placement on your account — we never see your password, never hold your funds, and you can revoke access from Alpaca's settings at any time. Your money stays at Alpaca, SIPC-insured.`,
          },
          {
            title: "What the AI does",
            body: `When you deploy a strategy, the same AI agent that runs in the experiment runs for your account. It receives your current positions and cash balance, the latest market prices and news for S&P 500 stocks, and the strategy prompt (e.g., "you are a momentum trader — buy top-quartile performers"). It then submits trade decisions as structured JSON, which we execute via the Alpaca order API. Every decision is logged with the AI's reasoning so you can see exactly why each trade was made.`,
          },
          {
            title: "Risk controls",
            body: `Regardless of what the AI recommends, we enforce hard limits: no single position can exceed 20% of your portfolio, cash never drops below 5%, and weekly turnover is capped at 50%. You can pause at any time. Position sizes are yours to configure — the defaults match the experiment's "moderate" aggression setting.`,
          },
          {
            title: "The honest caveat",
            body: `Paper trading performance is not the same as live trading. Real accounts have slippage, wider bid-ask spreads, and market impact. The experiment uses realistic cost modeling (0.15% round-trip spread), but live results will differ. We show you the paper results because they're the best signal we have — not because they guarantee anything. This is not investment advice.`,
          },
        ].map(({ title, body }) => (
          <section key={title} className="space-y-2">
            <h2 className="text-sm font-semibold border-b border-border pb-2">{title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          </section>
        ))}

        <div className="pt-4 flex gap-3">
          <Link href="/strategies">
            <Button>Browse strategies</Button>
          </Link>
          <Link href="https://ai-trader-opal.vercel.app" target="_blank">
            <Button variant="outline">View the experiment</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
