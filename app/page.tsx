import Link from "next/link";
import { ArrowRight, BarChart3, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <main className="flex flex-col flex-1">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 max-w-3xl mx-auto space-y-6">
        <Badge variant="secondary" className="text-xs font-mono">
          Backed by 726 live paper-trading trials · 52-week experiment
        </Badge>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
          AI trading strategies,{" "}
          <span className="text-primary">empirically tested.</span>
          <br />
          Deploy to your account.
        </h1>

        <p className="text-muted-foreground text-lg max-w-xl leading-relaxed">
          We run 726 AI trading agents simultaneously across value, momentum, growth, and more strategies.
          Browse live performance data, pick the strategy you believe in, and connect it to your Alpaca brokerage account.
        </p>

        <div className="flex items-center gap-3 pt-2">
          <Link href="/strategies">
            <Button size="lg" className="gap-2">
              Browse strategies <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/how-it-works">
            <Button size="lg" variant="outline">
              How it works
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground pt-4 max-w-sm">
          Past paper trading performance does not guarantee live results. This is not investment advice.
        </p>
      </section>

      {/* How it works */}
      <section className="border-t border-border px-6 py-20 max-w-4xl mx-auto w-full">
        <h2 className="text-xl font-semibold text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <BarChart3 className="w-5 h-5 text-primary" />,
              step: "01",
              title: "Browse live results",
              body: "See real performance data from 726 AI paper-trading trials running since April 2026. Ranked by return, alpha, and strategy.",
            },
            {
              icon: <Zap className="w-5 h-5 text-primary" />,
              step: "02",
              title: "Pick a strategy",
              body: "Choose a strategy and AI model combination. Connect your Alpaca account with one OAuth click — we never hold your funds.",
            },
            {
              icon: <ShieldCheck className="w-5 h-5 text-primary" />,
              step: "03",
              title: "AI trades for you",
              body: "Every Friday at 4:30pm ET, the same AI agent that runs in our experiment executes trades in your real account. Pause anytime.",
            },
          ].map(({ icon, step, title, body }) => (
            <div key={step} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground/50">{step}</span>
                {icon}
              </div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Experiment callout */}
      <section className="border-t border-border px-6 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="text-lg font-semibold">Built on a real experiment</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Unlike black-box robo-advisors, every strategy here is publicly tested. 726 AI agents have been trading paper
            money since April 13, 2026 across 7 strategies and 3 AI models (Claude Haiku, GPT-4o-mini, Gemini Flash 2).
            You see exactly what works before deploying real capital.
          </p>
          <div className="flex items-center justify-center gap-6 pt-2 text-xs text-muted-foreground">
            <span>726 live trials</span>
            <span>·</span>
            <span>7 strategies</span>
            <span>·</span>
            <span>3 AI models</span>
            <span>·</span>
            <span>52-week experiment</span>
          </div>
          <div className="pt-4">
            <Link
              href="https://ai-trader-opal.vercel.app"
              target="_blank"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            >
              View the full experiment →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>AI Extension Trader</span>
        <span>Not financial advice. Paper trading results do not guarantee live performance.</span>
      </footer>
    </main>
  );
}
