import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/playground", label: "Playground" },
  { href: "/coverage", label: "Coverage" },
  { href: "/live-tests", label: "Live Tests" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 4h10M2 7h7M2 10h5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-mono text-sm font-semibold tracking-tight">
              solana-kit-migrator
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 rounded text-sm font-mono transition-colors",
                  location === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-3 px-3 py-1.5 rounded text-sm font-mono bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>solana-kit-migrator — web3.js v1 → @solana/kit</span>
          <span>DoraHacks Boring AI Hackathon 2025</span>
        </div>
      </footer>
    </div>
  );
}
