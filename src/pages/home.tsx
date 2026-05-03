import { Link } from "wouter";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { COVERAGE_CATEGORIES, MIGRATION_EXAMPLES, REPO_TEST_RESULTS, AGGREGATE } from "@/lib/migrator";

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
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className="text-xs font-mono px-2 py-1 rounded bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-all"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

export function Home() {
  const [activeExample, setActiveExample] = useState(0);

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
            The definitive Solana<br />
            <span className="text-primary">SDK migration</span> tool.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Automate your migration from{" "}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-sm text-foreground">@solana/web3.js v1</code>{" "}
            to{" "}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-sm text-foreground">@solana/kit</code>.
            Runs entirely in your browser — no upload, no server, just fast.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-primary text-primary-foreground font-mono text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Try it now
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded border border-border bg-card font-mono text-sm text-muted-foreground">
            <span className="text-primary">$</span>
            <span>npx @codemod/cli run @arpit2222/solana-web3js-to-kit</span>
            <CopyButton text="npx @codemod/cli run @arpit2222/solana-web3js-to-kit" />
          </div>
        </div>

        {/* Stats — bundled sample corpus */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          {[
            { label: "fixture coverage", value: `${AGGREGATE.coveragePercent}%`, color: "text-primary", sub: "sample corpus" },
            { label: "total transforms", value: AGGREGATE.totalChanges.toLocaleString(), color: "text-green-400", sub: `${AGGREGATE.filesWithWeb3} files touched` },
            { label: "sample repos", value: `${AGGREGATE.reposTested}`, color: "text-cyan-400", sub: "bundled validation set" },
            { label: "AI flagged", value: AGGREGATE.aiRequiredChanges.toLocaleString(), color: "text-amber-400", sub: `of ${AGGREGATE.totalChanges.toLocaleString()} total` },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded border border-border bg-card space-y-1">
              <div className={cn("text-3xl font-bold font-mono", stat.color)}>{stat.value}</div>
              <div className="text-xs text-muted-foreground font-mono">{stat.label}</div>
              <div className="text-xs text-muted-foreground/60 font-mono">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-8">
        <h2 className="text-xl font-bold font-mono">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Load your code",
              description: "Paste directly, drag & drop a .ts/.js file, or fetch any GitHub file by URL. The playground loads and auto-migrates in one click.",
              color: "text-primary border-primary/20 bg-primary/5",
              numColor: "text-primary/40",
            },
            {
              step: "02",
              title: "Bulk migration automated",
              description: "Deterministic transforms handle imports, Connection → RPC, Keypair, PublicKey, Buffer, lamports, and common transaction patterns — all in your browser, with no server dependency.",
              color: "text-green-400 border-green-400/20 bg-green-400/5",
              numColor: "text-green-400/40",
            },
            {
              step: "03",
              title: "Review the diff",
              description: "The built-in diff view shows exactly what changed, line by line. Hard cases get precise /* TODO: AI_REQUIRED */ comments with the exact target API.",
              color: "text-cyan-400 border-cyan-400/20 bg-cyan-400/5",
              numColor: "text-cyan-400/40",
            },
          ].map((item) => (
            <div key={item.step} className={cn("p-6 rounded border space-y-3", item.color)}>
              <div className={cn("text-4xl font-bold font-mono", item.numColor)}>{item.step}</div>
              <div className="text-base font-bold font-mono">{item.title}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Quick feature list */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Real-time migration", desc: "Output updates as you type (600ms debounce)" },
            { label: "Side-by-side diff", desc: "GitHub-style before/after line comparison" },
            { label: "Cmd+Enter shortcut", desc: "Run migration instantly from keyboard" },
            { label: "GitHub URL fetch", desc: "Paste any /blob/ link to load & migrate directly" },
            { label: "File upload / drag-drop", desc: ".ts, .tsx, .js, .jsx, .mjs supported" },
            { label: "Shareable links", desc: "Share playground state via URL hash" },
            { label: "Download migrated file", desc: "Export as migrated-{filename}.ts" },
            { label: "27 connection methods", desc: "Every RPC call pattern auto-transformed" },
          ].map((f) => (
            <div key={f.label} className="p-3 rounded border border-border bg-card space-y-0.5">
              <div className="text-xs font-mono font-medium text-foreground flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                {f.label}
              </div>
              <p className="text-xs text-muted-foreground font-mono pl-2.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Real repo test results */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-mono">Validation corpus</h2>
            <p className="text-xs font-mono text-muted-foreground">
              Numbers reflect the bundled sample validation set and fixture-backed test harness.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono text-primary">{AGGREGATE.coveragePercent}%</div>
            <div className="text-xs font-mono text-muted-foreground">sample aggregate</div>
          </div>
        </div>

        <div className="overflow-hidden rounded border border-border">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">repository</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">files</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">changes</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">automated</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">AI flagged</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">coverage</th>
              </tr>
            </thead>
            <tbody>
              {REPO_TEST_RESULTS.map((r, i) => (
                <tr key={r.repo} className={cn("border-b border-border last:border-0", i % 2 === 0 ? "bg-card" : "bg-card/50")}>
                  <td className="px-4 py-3">
                    <a
                      href={`https://github.com/${r.repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:text-primary transition-colors"
                    >
                      {r.repo}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{r.filesWithWeb3}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{r.totalChanges.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-400">{r.automaticChanges.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-amber-400">{r.aiRequiredChanges}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", r.coveragePercent >= 90 ? "bg-primary" : "bg-amber-400")}
                          style={{ width: `${r.coveragePercent}%` }}
                        />
                      </div>
                      <span className={r.coveragePercent >= 90 ? "text-primary" : "text-amber-400"}>{r.coveragePercent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {/* Aggregate row */}
              <tr className="bg-primary/5 border-t-2 border-primary/20">
                <td className="px-4 py-3 text-primary font-medium">aggregate ({AGGREGATE.reposTested} repos)</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{AGGREGATE.filesWithWeb3}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{AGGREGATE.totalChanges.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-green-400 font-medium">{AGGREGATE.automaticChanges.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-amber-400 font-medium">{AGGREGATE.aiRequiredChanges}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${AGGREGATE.coveragePercent}%` }} />
                    </div>
                    <span className="text-primary font-bold">{AGGREGATE.coveragePercent}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Per-repo notes */}
        <div className="grid md:grid-cols-2 gap-3">
          {REPO_TEST_RESULTS.map((r) => (
            <div key={r.repo} className="p-3 rounded border border-border bg-card flex items-start gap-3">
              <div className={cn(
                "mt-0.5 text-xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0",
                r.coveragePercent >= 90 ? "text-primary bg-primary/10" : "text-amber-400 bg-amber-400/10"
              )}>
                {r.coveragePercent}%
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="text-xs font-mono text-muted-foreground truncate">{r.repo}</div>
                <div className="text-xs text-muted-foreground/70 font-mono leading-relaxed">{r.note}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Coverage by category */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-mono">Coverage by category</h2>
          <Link href="/coverage" className="text-sm font-mono text-primary hover:underline">Full breakdown →</Link>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {COVERAGE_CATEGORIES.map((cat) => (
            <div key={cat.name} className="p-4 rounded border border-border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-mono px-2 py-0.5 rounded border", CATEGORY_COLORS[cat.name] ?? "text-foreground bg-muted border-border")}>
                    {cat.name}
                  </span>
                  {!cat.automated && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded border text-amber-400 bg-amber-400/10 border-amber-400/20">AI-assisted</span>
                  )}
                </div>
                <span className="text-sm font-mono font-bold">{cat.coveragePercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full", cat.automated ? "bg-primary" : "bg-amber-400")}
                  style={{ width: `${cat.coveragePercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{cat.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Before/After examples */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold font-mono">Migration examples</h2>
        <div className="flex gap-2 flex-wrap">
          {MIGRATION_EXAMPLES.map((ex, i) => (
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
        {MIGRATION_EXAMPLES[activeExample] && (
          <div className="rounded border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={cn("text-xs font-mono px-2 py-0.5 rounded border", CATEGORY_COLORS[MIGRATION_EXAMPLES[activeExample].category] ?? "text-foreground bg-muted border-border")}>
                  {MIGRATION_EXAMPLES[activeExample].category}
                </span>
                <span className="text-sm font-mono text-muted-foreground">{MIGRATION_EXAMPLES[activeExample].title}</span>
              </div>
              {MIGRATION_EXAMPLES[activeExample].flaggedForAI && (
                <span className="text-xs font-mono px-2 py-0.5 rounded border text-amber-400 bg-amber-400/10 border-amber-400/20">AI Required</span>
              )}
            </div>
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="p-4">
                <div className="text-xs font-mono text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> before
                </div>
                <pre className="text-xs font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap overflow-auto max-h-48">{MIGRATION_EXAMPLES[activeExample].before}</pre>
              </div>
              <div className="p-4">
                <div className="text-xs font-mono text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> after
                </div>
                <pre className="text-xs font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap overflow-auto max-h-48">{MIGRATION_EXAMPLES[activeExample].after}</pre>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground font-mono">{MIGRATION_EXAMPLES[activeExample].description}</p>
            </div>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="p-8 rounded border border-primary/20 bg-primary/5 text-center space-y-4">
        <h2 className="text-2xl font-bold font-mono">Ready to migrate?</h2>
        <p className="text-muted-foreground font-mono text-sm max-w-lg mx-auto">
          {AGGREGATE.coveragePercent}% automated across {AGGREGATE.totalChanges.toLocaleString()} sample transforms.
          Complex transaction patterns are flagged with clear AI review comments.
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
