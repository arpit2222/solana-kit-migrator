import { useState } from "react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { COVERAGE_CATEGORIES, REPOS_TESTED, PATTERN_REFERENCE, AGGREGATE } from "@/lib/migrator";

const CATEGORY_COLORS: Record<string, string> = {
  imports: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  connection: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  keypair: "text-green-400 bg-green-400/10 border-green-400/20",
  publickey: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  transaction: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  buffer: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  lamports: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

const ALL_CATEGORIES = ["all", "imports", "connection", "keypair", "publickey", "transaction", "buffer", "lamports"];

function downloadReport() {
  const report = {
    generated: new Date().toISOString(),
    aggregate: AGGREGATE,
    categories: COVERAGE_CATEGORIES,
    patterns: PATTERN_REFERENCE,
    reposTested: REPOS_TESTED,
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "solana-kit-migration-report.json"; a.click();
  URL.revokeObjectURL(url);
}

export function Coverage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [showAuto, setShowAuto] = useState(true);
  const [showAi, setShowAi] = useState(true);

  const filtered = PATTERN_REFERENCE.filter((p) => {
    if (activeCategory !== "all" && p.category !== activeCategory) return false;
    if (!showAuto && p.auto) return false;
    if (!showAi && !p.auto) return false;
    return true;
  });

  const OVERALL = AGGREGATE.coveragePercent;

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold font-mono">Coverage breakdown</h1>
            <p className="text-muted-foreground font-mono text-sm max-w-2xl leading-relaxed">
              Coverage numbers by migration category, measured against the bundled sample repositories.
              Patterns are flagged for AI when a structural rewrite is needed — not pretended away.
            </p>
          </div>
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 px-4 py-2 rounded border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-accent transition-all shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v7M3 6l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            export report
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-5xl font-bold font-mono text-primary">{OVERALL}%</div>
          <div className="space-y-1">
            <div className="text-xs font-mono text-muted-foreground">aggregate automated</div>
            <div className="w-48 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${OVERALL}%` }} />
            </div>
            <div className="text-xs font-mono text-muted-foreground/60">
              {AGGREGATE.automaticChanges.toLocaleString()} auto · {AGGREGATE.aiRequiredChanges} AI required · {AGGREGATE.totalChanges.toLocaleString()} total
            </div>
          </div>
        </div>
      </div>

      {/* Category cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-mono">By category</h2>
        <div className="space-y-3">
          {COVERAGE_CATEGORIES.map((cat) => (
            <div key={cat.name} className="p-5 rounded border border-border bg-card space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs font-mono px-2.5 py-1 rounded border font-medium", CATEGORY_COLORS[cat.name] ?? "text-foreground bg-muted border-border")}>
                    {cat.name}
                  </span>
                  <span className={cn(
                    "text-xs font-mono px-2.5 py-1 rounded border",
                    cat.automated ? "text-green-400 bg-green-400/10 border-green-400/20" : "text-amber-400 bg-amber-400/10 border-amber-400/20"
                  )}>
                    {cat.automated ? "automated" : "AI-assisted"}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{cat.transformCount} rules</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold font-mono text-foreground">{cat.coveragePercent}%</span>
                  <button
                    onClick={() => setActiveCategory(cat.name)}
                    className="text-xs font-mono text-primary/60 hover:text-primary underline-offset-2 hover:underline transition-colors"
                  >
                    view patterns
                  </button>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", cat.automated ? "bg-primary" : "bg-amber-400")}
                  style={{ width: `${cat.coveragePercent}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed font-mono">{cat.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pattern reference */}
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold font-mono">Pattern reference</h2>
            <p className="text-xs font-mono text-muted-foreground mt-1">Every rule the engine supports, with before/after examples.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setShowAuto((v) => !v)}
              className={cn("px-2.5 py-1 rounded border transition-all", showAuto ? "text-green-400 bg-green-400/10 border-green-400/20" : "border-border text-muted-foreground")}
            >
              auto
            </button>
            <button
              onClick={() => setShowAi((v) => !v)}
              className={cn("px-2.5 py-1 rounded border transition-all", showAi ? "text-amber-400 bg-amber-400/10 border-amber-400/20" : "border-border text-muted-foreground")}
            >
              AI⚠
            </button>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 flex-wrap">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "text-xs font-mono px-2.5 py-1 rounded border transition-all",
                activeCategory === cat
                  ? cat === "all"
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : (CATEGORY_COLORS[cat] ?? "text-foreground bg-muted border-border")
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {cat === "all" ? `all (${PATTERN_REFERENCE.length})` : `${cat} (${PATTERN_REFERENCE.filter((p) => p.category === cat).length})`}
            </button>
          ))}
        </div>

        {/* Pattern table */}
        <div className="overflow-hidden rounded border border-border">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium w-5">cat</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">pattern</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium w-10">mode</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">before</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">after</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={i} className={cn("border-b border-border last:border-0 align-top", i % 2 === 0 ? "bg-card" : "bg-card/50")}>
                  <td className="px-4 py-3">
                    <span className={cn("px-1.5 py-0.5 rounded border text-xs", CATEGORY_COLORS[p.category] ?? "text-foreground bg-muted border-border")}>
                      {p.category.slice(0, 3)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{p.name}</td>
                  <td className="px-4 py-3">
                    {p.auto ? (
                      <span className="text-green-400 font-bold">auto</span>
                    ) : (
                      <span className="text-amber-400 font-bold">AI⚠</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <pre className="text-red-400/70 whitespace-pre-wrap break-all leading-relaxed">{p.before}</pre>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <pre className={cn("whitespace-pre-wrap break-all leading-relaxed", p.auto ? "text-green-400/70" : "text-amber-400/70")}>{p.after}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-xs font-mono text-muted-foreground">
              No patterns match the current filters.
            </div>
          )}
        </div>
        <p className="text-xs font-mono text-muted-foreground/60">{filtered.length} of {PATTERN_REFERENCE.length} patterns shown</p>
      </div>

      {/* Methodology */}
      <div className="p-6 rounded border border-border bg-card/50 space-y-3">
        <h2 className="text-base font-bold font-mono">Methodology</h2>
        <div className="space-y-2 text-sm text-muted-foreground font-mono leading-relaxed">
          <p>Coverage percentages reflect the share of patterns observed across {REPOS_TESTED.length} bundled sample repositories that are handled deterministically by the codemod engine.</p>
          <p>
            <span className="text-amber-400">Transaction building</span> is partially AI-assisted — the new @solana/kit transaction model is an architectural change, not a find-replace.
            Chained <code className="bg-muted px-1 rounded">new Transaction().add()</code> calls require understanding each instruction argument.
            We insert precise <code className="bg-muted px-1 rounded">// TODO: AI_REQUIRED</code> comments with the exact target API so AI can complete the rewrite in one shot.
          </p>
          <p>Tested on: {REPOS_TESTED.join(", ")}.</p>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex items-center gap-4 flex-wrap">
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
        <button
          onClick={downloadReport}
          className="text-sm font-mono text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
        >
          Download full report (JSON)
        </button>
      </div>
    </div>
  );
}
