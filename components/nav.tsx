"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGES = [
  { label: "Home", href: "/" },
  { label: "Strategies", href: "/strategies" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "How it works", href: "/how-it-works" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-border bg-background px-6 py-3 flex items-center justify-between">
      <Link href="/" className="text-sm font-semibold tracking-tight hover:text-muted-foreground transition-colors">
        AI Extension Trader
      </Link>
      <div className="hidden md:flex items-center gap-5">
        {PAGES.map(p => (
          <Link
            key={p.href}
            href={p.href}
            className={`text-sm transition-colors ${
              pathname === p.href
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
