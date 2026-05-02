import { useGetCoverage, useGetExamples, useListSessions } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useState } from "react";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  imports: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  connection: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  keypair: "text-green-400 bg-green-400/10 border-green-400/20",
  publickey: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  transaction: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  buffer: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  lamports: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="text-xs font-mono px-2 py-1 rounded bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-all"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

export function Home() {
  const { data: coverage } = useGetCoverage();
  const { data: examplesData } = useGetExamples();
  const { data: sessionsData } = useListSessions();
  const [activeExample, setActiveExample] = useState(0);

  const examples = examplesData?.examples ?? [];
  const categories = coverage?.categories ?? [];
  const recentSessions = sessionsData?.sessions?.slice(0, 5) ?? [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-24">
      {/* Hero */}
      <section className="space-y-8">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            @solana/web3.js v1 → @solana/kit
          </div>
          <h1 className="text-5xl font-bold tracking-tight font-mono leading-tight">
            The definitive Solana
            <br />
            <span className="text-primary">SDK migration</span> tool.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Automate your migration from <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-sm text-foreground">@solana/web3.js v1</code> to <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-sm text-foreground">@solana/kit</code>.
            Covers imports, Connection, Keypair, PublicKey, Buffer encoding, and more —
            with honest flagging of the complex cases AI needs to handle.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-primary text-primary-foreground font-mono text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Try it online
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded border border-border bg-card font-mono text-sm text-muted-foreground">
            <span className="text-primary">$</span>
            <span>npx @codemod/cli run solana-web3js-to-kit</span>
            <CopyButton text="npx @codemod/cli run solana-web3js-to-kit" />
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          {[
            { label: "overall coverage", value: coverage ? `${coverage.overall}%` : "—", color: "text-primary" },
            { label: "transform rules", value: coverage ? `${coverage.totalTransforms}` : "—", color: "text-green-400" },
            { label: "repos tested", value: coverage ? `${coverage.reposTestedCount}` : "—", color: "text-cyan-400" },
            { label: "automated", value: coverage ? `${coverage.categories.filter(c => c.automated).length}/7` : "—", color: "text-emerald-400" },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded border border-border bg-card space-y-1">
              <div className={cn("text-3xl font-bold font-mono", stat.color)}>{stat.value}</div>
              <div className="text-xs text-muted-foreground font-mono">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Coverage by category */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-mono">Migration coverage</h2>
          <Link href="/coverage" className="text-sm font-mono text-primary hover:underline">
            Full breakdown →
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {categories.map((cat) => (
            <div key={cat.name} className="p-4 rounded border border-border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-mono px-2 py-0.5 rounded border", CATEGORY_COLORS[cat.name] ?? "text-foreground bg-muted border-border")}>
                    {cat.name}
                  </span>
                  {!cat.automated && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded border text-amber-400 bg-amber-400/10 border-amber-400/20">
                      AI-assisted
                    </span>
                  )}
                </div>
                <span className="text-sm font-mono font-bold text-foreground">{cat.coveragePercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    cat.automated ? "bg-primary" : "bg-amber-400"
                  )}
                  style={{ width: `${cat.coveragePercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{cat.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Before/after examples */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold font-mono">Migration examples</h2>

        <div className="flex gap-2 flex-wrap">
          {examples.map((ex, i) => (
            <button
              key={ex.id}
              onClick={() => setActiveExample(i)}
              className={cn(
                "text-xs font-mono px-3 py-1.5 rounded border transition-all",
                i === activeExample
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {ex.title}
            </button>
          ))}
        </div>

        {examples[activeExample] && (
          <div className="rounded border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={cn("text-xs font-mono px-2 py-0.5 rounded border", CATEGORY_COLORS[examples[activeExample].category] ?? "text-foreground bg-muted border-border")}>
                  {examples[activeExample].category}
                </span>
                <span className="text-sm font-mono text-muted-foreground">{examples[activeExample].title}</span>
              </div>
              {examples[activeExample].flaggedForAI && (
                <span className="text-xs font-mono px-2 py-0.5 rounded border text-amber-400 bg-amber-400/10 border-amber-400/20">
                  AI Required
                </span>
              )}
            </div>
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="p-4 space-y-2">
                <div className="text-xs font-mono text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  before
                </div>
                <pre className="text-xs font-mono text-foreground leading-relaxed whitespace-pre-wrap overflow-auto max-h-48">{examples[activeExample].before}</pre>
              </div>
              <div className="p-4 space-y-2">
                <div className="text-xs font-mono text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  after
                </div>
                <pre className="text-xs font-mono text-foreground leading-relaxed whitespace-pre-wrap overflow-auto max-h-48">{examples[activeExample].after}</pre>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground font-mono">{examples[activeExample].description}</p>
            </div>
          </div>
        )}
      </section>

      {/* Tested repos */}
      {coverage && (
        <section className="space-y-6">
          <h2 className="text-xl font-bold font-mono">Tested on real repos</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {coverage.reposTested.map((repo) => (
              <a
                key={repo}
                href={`https://github.com/${repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted-foreground group-hover:text-primary transition-colors">
                    <path d="M7 1C3.686 1 1 3.686 1 7c0 2.652 1.72 4.9 4.11 5.694.3.055.41-.13.41-.29v-1.015c-1.67.363-2.02-.804-2.02-.804-.274-.697-.67-.883-.67-.883-.546-.374.04-.367.04-.367.605.043.922.62.922.62.537.92 1.408.653 1.75.5.054-.39.21-.653.382-.803-1.334-.152-2.737-.667-2.737-2.97 0-.656.234-1.192.62-1.613-.062-.152-.268-.763.058-1.59 0 0 .506-.162 1.656.617A5.77 5.77 0 017 4.578a5.77 5.77 0 011.505.202c1.15-.78 1.655-.617 1.655-.617.326.827.12 1.438.06 1.59.385.42.618.957.618 1.612 0 2.31-1.406 2.817-2.744 2.965.216.186.407.552.407 1.114v1.65c0 .16.108.347.413.29C11.282 11.898 13 9.652 13 7c0-3.314-2.686-6-6-6z" fill="currentColor"/>
                  </svg>
                  <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">{repo}</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-xl font-bold font-mono">Recent migrations</h2>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div key={session.id} className="p-4 rounded border border-border bg-card flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    {new Date(session.createdAt).toLocaleTimeString()}
                  </span>
                  <span className="text-xs font-mono text-foreground truncate">
                    {session.filename ?? "untitled.ts"}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                  <span className="text-green-400">{session.stats.automaticChanges} auto</span>
                  {session.stats.aiRequiredChanges > 0 && (
                    <span className="text-amber-400">{session.stats.aiRequiredChanges} AI</span>
                  )}
                  <span className="text-primary">{session.stats.coveragePercent}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="p-8 rounded border border-primary/20 bg-primary/5 space-y-4 text-center">
        <h2 className="text-2xl font-bold font-mono">Ready to migrate?</h2>
        <p className="text-muted-foreground font-mono text-sm max-w-lg mx-auto">
          Paste your web3.js v1 code into the playground and get migrated output in seconds.
          75-85% automated. The rest is flagged for AI review.
        </p>
        <Link
          href="/playground"
          className="inline-flex items-center gap-2 px-6 py-3 rounded bg-primary text-primary-foreground font-mono text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Open Playground
        </Link>
      </section>
    </div>
  );
}
