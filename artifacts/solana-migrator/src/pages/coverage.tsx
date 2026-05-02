import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { COVERAGE_CATEGORIES, REPOS_TESTED } from "@/lib/migrator";

const CATEGORY_COLORS: Record<string, string> = {
  imports: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  connection: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  keypair: "text-green-400 bg-green-400/10 border-green-400/20",
  publickey: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  transaction: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  buffer: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  lamports: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

const OVERALL = Math.round(
  COVERAGE_CATEGORIES.reduce((s, c) => s + c.coveragePercent, 0) / COVERAGE_CATEGORIES.length
);

export function Coverage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold font-mono">Coverage breakdown</h1>
        <p className="text-muted-foreground font-mono text-sm max-w-2xl leading-relaxed">
          Honest coverage numbers by migration category. 75–85% of patterns are automated.
          The transaction pipeline is genuinely complex — we flag those for AI review rather than pretending.
        </p>
        <div className="flex items-center gap-3">
          <div className="text-5xl font-bold font-mono text-primary">{OVERALL}%</div>
          <div className="space-y-1">
            <div className="text-xs font-mono text-muted-foreground">weighted average</div>
            <div className="w-48 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${OVERALL}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {COVERAGE_CATEGORIES.map((cat) => (
          <div key={cat.name} className="p-6 rounded border border-border bg-card space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className={cn("text-xs font-mono px-2.5 py-1 rounded border font-medium", CATEGORY_COLORS[cat.name] ?? "text-foreground bg-muted border-border")}>
                  {cat.name}
                </span>
                <span className={cn(
                  "text-xs font-mono px-2.5 py-1 rounded border",
                  cat.automated
                    ? "text-green-400 bg-green-400/10 border-green-400/20"
                    : "text-amber-400 bg-amber-400/10 border-amber-400/20"
                )}>
                  {cat.automated ? "automated" : "AI-assisted"}
                </span>
                <span className="text-xs font-mono text-muted-foreground">{cat.transformCount} rules</span>
              </div>
              <span className="text-2xl font-bold font-mono text-foreground">{cat.coveragePercent}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", cat.automated ? "bg-primary" : "bg-amber-400")}
                style={{ width: `${cat.coveragePercent}%` }}
              />
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed font-mono">{cat.description}</p>
          </div>
        ))}
      </div>

      {/* Methodology note */}
      <div className="p-6 rounded border border-border bg-card/50 space-y-3">
        <h2 className="text-base font-bold font-mono">Methodology</h2>
        <div className="space-y-2 text-sm text-muted-foreground font-mono leading-relaxed">
          <p>Coverage percentages reflect the share of real-world patterns we've observed across {REPOS_TESTED.length} production repositories that are handled deterministically by the codemod.</p>
          <p>
            <span className="text-amber-400">Transaction building</span> is intentionally low (30%) — the new @solana/kit transaction model is an architectural change, not a find-replace. Pretending otherwise would produce broken code.
            We insert clear <code className="bg-muted px-1 rounded">// TODO: AI_REQUIRED</code> comments so you know exactly what needs human attention.
          </p>
          <p>Tested on: {REPOS_TESTED.join(", ")}.</p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-4">
        <Link
          href="/playground"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-primary text-primary-foreground font-mono text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Try the playground
        </Link>
        <a
          href="https://github.com/anza-xyz/solana-web3.js/blob/master/MIGRATION.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-mono text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
        >
          Official migration guide
        </a>
      </div>
    </div>
  );
}
