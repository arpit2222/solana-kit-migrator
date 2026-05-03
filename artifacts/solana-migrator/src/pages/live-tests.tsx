import { useState, useRef, useEffect, useCallback } from "react";
import { migrateCode } from "@/lib/migrator";

const LIVE_TEST_FILES = [
  {
    repo: "solana-labs/example-helloworld",
    file: "src/client/hello_world.ts",
    url: "https://raw.githubusercontent.com/solana-labs/example-helloworld/master/src/client/hello_world.ts",
    description: "Classic hello world program client",
  },
  {
    repo: "metaplex-foundation/mpl-token-metadata",
    file: "clients/js/src/generated/instructions/burnV1.ts",
    url: "https://raw.githubusercontent.com/metaplex-foundation/mpl-token-metadata/main/clients/js/src/generated/instructions/burnV1.ts",
    description: "MPL Token Metadata burn instruction",
  },
  {
    repo: "coral-xyz/anchor",
    file: "ts/packages/anchor/src/provider.ts",
    url: "https://raw.githubusercontent.com/coral-xyz/anchor/master/ts/packages/anchor/src/provider.ts",
    description: "Anchor framework RPC provider",
  },
];

type LogType = "info" | "success" | "warn" | "error" | "heading" | "dim" | "transform" | "separator";
type LogLine = { text: string; type: LogType; id: number };

let logId = 0;
function mkLog(text: string, type: LogType): LogLine {
  return { text, type, id: ++logId };
}

function ts() {
  return new Date().toISOString().slice(11, 23).replace("T", "");
}

const LOG_COLORS: Record<LogType, string> = {
  heading:   "text-primary font-bold",
  success:   "text-green-400",
  warn:      "text-amber-400",
  error:     "text-red-400",
  transform: "text-cyan-400",
  info:      "text-foreground",
  dim:       "text-muted-foreground/60",
  separator: "text-muted-foreground/30",
};

type FileResult = {
  repo: string;
  file: string;
  status: "ok" | "skip" | "error";
  totalChanges: number;
  automaticChanges: number;
  aiRequiredChanges: number;
  coveragePercent: number;
  byCategory: Record<string, number>;
  sampleTransforms: { category: string; flaggedForAI: boolean; original: string }[];
};

type RunState = "idle" | "running" | "done";

export function LiveTests() {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [runState, setRunState] = useState<RunState>("idle");
  const [results, setResults] = useState<FileResult[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const pushLog = useCallback((line: LogLine) => {
    setLogs((prev) => [...prev, line]);
  }, []);

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const runTests = useCallback(async () => {
    abortRef.current = false;
    setLogs([]);
    setResults([]);
    setRunState("running");

    const collected: FileResult[] = [];

    await delay(80);
    pushLog(mkLog(`[${ts()}] Initializing live test runner...`, "dim"));
    await delay(120);
    pushLog(mkLog(`[${ts()}] Test suite: ${LIVE_TEST_FILES.length} sample repositories`, "dim"));
    await delay(80);
    pushLog(mkLog(`[${ts()}] Fetching files from GitHub via raw.githubusercontent.com`, "dim"));
    await delay(100);
    pushLog(mkLog("─".repeat(60), "separator"));

    for (let i = 0; i < LIVE_TEST_FILES.length; i++) {
      if (abortRef.current) break;
      const f = LIVE_TEST_FILES[i];
      await delay(200);
      pushLog(mkLog("", "dim"));
      pushLog(mkLog(`[${ts()}] REPO ${i + 1}/${LIVE_TEST_FILES.length}  ${f.repo}`, "heading"));
      pushLog(mkLog(`[${ts()}]   ${f.description}`, "dim"));
      await delay(150);
      pushLog(mkLog(`[${ts()}] ⬇  Fetching ${f.file}...`, "info"));

      let code: string;
      try {
        const resp = await fetch(f.url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        code = await resp.text();
        const kb = (code.length / 1024).toFixed(1);
        pushLog(mkLog(`[${ts()}] ✓  Fetched (${kb} KB, ${code.split("\n").length} lines)`, "success"));
      } catch (e) {
        pushLog(mkLog(`[${ts()}] ✗  Fetch failed: ${e}`, "error"));
        pushLog(mkLog(`[${ts()}]    SKIP — network unreachable`, "dim"));
        collected.push({ repo: f.repo, file: f.file, status: "error", totalChanges: 0, automaticChanges: 0, aiRequiredChanges: 0, coveragePercent: 100, byCategory: {}, sampleTransforms: [] });
        continue;
      }

      await delay(80);
      pushLog(mkLog(`[${ts()}] ⚡ Running migrator engine...`, "info"));
      await delay(60);

      const result = migrateCode(code);

      if (result.stats.totalChanges === 0) {
        pushLog(mkLog(`[${ts()}]   (no @solana/web3.js v1 patterns found — file may use newer API)`, "dim"));
        pushLog(mkLog(`[${ts()}] ✓  CLEAN — 0 transforms needed`, "success"));
        collected.push({ repo: f.repo, file: f.file, status: "ok", totalChanges: 0, automaticChanges: 0, aiRequiredChanges: 0, coveragePercent: 100, byCategory: {}, sampleTransforms: [] });
      } else {
        for (const t of result.transforms.slice(0, 5)) {
          await delay(40);
          const flag = t.flaggedForAI ? "AI⚠ " : "AUTO";
          pushLog(mkLog(`[${ts()}]   [${flag}] [${t.category}]  ${t.original.slice(0, 55).replace(/\n/g, "\\n")}`, "transform"));
        }
        if (result.transforms.length > 5) {
          await delay(40);
          pushLog(mkLog(`[${ts()}]   ... and ${result.transforms.length - 5} more`, "dim"));
        }
        await delay(80);
        const s = result.stats;
        const icon = s.aiRequiredChanges === 0 ? "✓" : "⚠";
        const col: LogType = s.aiRequiredChanges === 0 ? "success" : "warn";
        pushLog(mkLog(
          `[${ts()}] ${icon}  ${s.totalChanges} transforms · ${s.coveragePercent}% automated · ${s.aiRequiredChanges} AI-required`,
          col
        ));
        if (Object.keys(s.byCategory).length > 0) {
          const cats = Object.entries(s.byCategory).map(([k, v]) => `${k}:${v}`).join("  ");
          pushLog(mkLog(`[${ts()}]    categories — ${cats}`, "dim"));
        }
        collected.push({
          repo: f.repo, file: f.file, status: "ok",
          totalChanges: s.totalChanges, automaticChanges: s.automaticChanges,
          aiRequiredChanges: s.aiRequiredChanges, coveragePercent: s.coveragePercent,
          byCategory: s.byCategory, sampleTransforms: result.transforms.slice(0, 3).map(t => ({
            category: t.category, flaggedForAI: t.flaggedForAI, original: t.original
          })),
        });
      }
    }

    await delay(200);
    pushLog(mkLog("", "dim"));
    pushLog(mkLog("═".repeat(60), "separator"));
    pushLog(mkLog(`[${ts()}] AGGREGATE RESULTS`, "heading"));
    pushLog(mkLog("═".repeat(60), "separator"));

    const totals = collected.reduce(
      (acc, r) => ({
        totalChanges: acc.totalChanges + r.totalChanges,
        automaticChanges: acc.automaticChanges + r.automaticChanges,
        aiRequiredChanges: acc.aiRequiredChanges + r.aiRequiredChanges,
      }),
      { totalChanges: 0, automaticChanges: 0, aiRequiredChanges: 0 }
    );
    const overall = totals.totalChanges === 0 ? 100 : Math.round((totals.automaticChanges / totals.totalChanges) * 100);

    await delay(100);
    pushLog(mkLog(`[${ts()}]   Repos tested:    ${collected.filter(r => r.status === "ok").length}`, "info"));
    pushLog(mkLog(`[${ts()}]   Total transforms: ${totals.totalChanges}`, "info"));
    pushLog(mkLog(`[${ts()}]   Automated:        ${totals.automaticChanges} (${overall}%)`, "success"));
    if (totals.aiRequiredChanges > 0) {
      pushLog(mkLog(`[${ts()}]   AI-required:      ${totals.aiRequiredChanges}`, "warn"));
    }
    pushLog(mkLog("─".repeat(60), "separator"));
    pushLog(mkLog(`[${ts()}] ✓  Test run complete`, "success"));

    setResults(collected);
    setRunState("done");
  }, [pushLog]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-green-400/10 border border-green-400/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h8M2 12h5" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="13" cy="11" r="2.5" stroke="#4ade80" strokeWidth="1.2"/>
              <path d="M12 11l.8.8 1.2-1.2" stroke="#4ade80" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-mono font-bold tracking-tight">Live Test Runner</h1>
        </div>
        <p className="text-muted-foreground text-sm font-mono">
          Fetches real TypeScript files from production GitHub repositories and runs the migrator live in your browser.
          No backend — all processing happens client-side.
        </p>
      </div>

      {/* Repo list */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {LIVE_TEST_FILES.map((f, i) => (
          <div key={i} className="border border-border rounded-lg p-3 bg-card/50 space-y-1">
            <div className="text-xs font-mono text-primary font-semibold">{f.repo}</div>
            <div className="text-xs font-mono text-muted-foreground truncate">{f.file}</div>
            <div className="text-xs text-muted-foreground/60">{f.description}</div>
          </div>
        ))}
      </div>

      {/* Run button */}
      <div className="flex items-center gap-4">
        <button
          onClick={runTests}
          disabled={runState === "running"}
          className="font-mono text-sm px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-wait transition-all flex items-center gap-2"
        >
          {runState === "running" ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10"/>
              </svg>
              Running…
            </>
          ) : runState === "done" ? "▶  Run Again" : "▶  Run Live Tests"}
        </button>
        {runState === "idle" && (
          <span className="text-xs font-mono text-muted-foreground">
            Fetches {LIVE_TEST_FILES.length} real files · runs in browser · ~3–5 seconds
          </span>
        )}
      </div>

      {/* Terminal */}
      {logs.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-card/80 px-4 py-2 border-b border-border flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400/60" />
              <div className="w-3 h-3 rounded-full bg-amber-400/60" />
              <div className="w-3 h-3 rounded-full bg-green-400/60" />
            </div>
            <span className="text-xs font-mono text-muted-foreground ml-2">solana-kit-migrator — live test output</span>
            {runState === "running" && (
              <span className="ml-auto text-xs font-mono text-amber-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                running
              </span>
            )}
            {runState === "done" && (
              <span className="ml-auto text-xs font-mono text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                complete
              </span>
            )}
          </div>
          <div
            ref={terminalRef}
            className="bg-background p-4 font-mono text-xs space-y-0.5 max-h-[480px] overflow-y-auto"
          >
            {logs.map((line) =>
              line.text === "" ? (
                <div key={line.id} className="h-2" />
              ) : (
                <div key={line.id} className={`leading-relaxed whitespace-pre-wrap break-all ${LOG_COLORS[line.type]}`}>
                  {line.text}
                </div>
              )
            )}
            {runState === "running" && (
              <div className="text-primary animate-pulse">█</div>
            )}
          </div>
        </div>
      )}

      {/* Results table */}
      {runState === "done" && results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-mono font-semibold text-foreground">Per-file Results</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border bg-card/50">
                  <th className="text-left px-4 py-2 text-muted-foreground font-normal">Repository</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-normal">File</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-normal">Transforms</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-normal">Automated</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-normal">AI-flagged</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-normal">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-accent/30">
                    <td className="px-4 py-2 text-primary">{r.repo}</td>
                    <td className="px-4 py-2 text-muted-foreground truncate max-w-[180px]">{r.file}</td>
                    <td className="px-4 py-2 text-right text-foreground">{r.totalChanges}</td>
                    <td className="px-4 py-2 text-right text-green-400">{r.automaticChanges}</td>
                    <td className="px-4 py-2 text-right text-amber-400">{r.aiRequiredChanges || "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={r.coveragePercent === 100 ? "text-green-400" : r.coveragePercent >= 90 ? "text-primary" : "text-amber-400"}>
                        {r.coveragePercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs font-mono text-muted-foreground/60">
            Results may vary based on network access and repository state. Core migration statistics
            are validated against the bundled sample suite and fixture-backed migration harness.
          </p>
        </div>
      )}
    </div>
  );
}
