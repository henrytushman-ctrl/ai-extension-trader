"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const PAGES = [
  { label: "Home", href: "/" },
  { label: "Strategies", href: "/strategies" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "How it works", href: "/how-it-works" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-border bg-background px-6 py-3">
      <div className="flex items-center justify-between">
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
        <button
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden flex flex-col gap-1 pt-3 pb-1">
          {PAGES.map(p => (
            <Link
              key={p.href}
              href={p.href}
              onClick={() => setOpen(false)}
              className={`text-sm py-2 transition-colors ${
                pathname === p.href
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
