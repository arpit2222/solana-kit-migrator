import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { migrateCode, type TransformDetail } from "@/lib/migrator";
import { checkTypeScript, type TsCheckResult } from "@/lib/ts-check";

const CATEGORY_COLORS: Record<string, string> = {
  imports: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  connection: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  keypair: "text-green-400 bg-green-400/10 border-green-400/20",
  publickey: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  transaction: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  buffer: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  lamports: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

const SAMPLE_CODE = `import {
  Connection, Keypair, PublicKey, Transaction, SystemProgram,
  LAMPORTS_PER_SOL, sendAndConfirmTransaction, SYSVAR_RENT_PUBKEY,
  TransactionInstruction
} from '@solana/web3.js';
import bs58 from 'bs58';

// Create connection & fund payer
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const payer = Keypair.generate();
const recipient = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Check balance
const balance = await connection.getBalance(payer.publicKey);
const rentMin = await connection.getMinimumBalanceForRentExemption(165);
const { blockhash } = await connection.getRecentBlockhash();
const version = await connection.getVersion();
console.log(\`Balance: \${balance / LAMPORTS_PER_SOL} SOL, rent: \${rentMin}, version: \${JSON.stringify(version)}\`);

// Encode / decode
const encoded = bs58.encode(Buffer.from('hello world'));
const decoded = bs58.decode(encoded);

// Build & send transaction (named vars → fully automated)
let tx = new Transaction();
tx.feePayer = payer.publicKey;
tx.recentBlockhash = blockhash;
tx = tx.add(transferIx);
await sendAndConfirmTransaction(connection, tx, [payer]);

// PDA derivation
const [pda] = PublicKey.findProgramAddressSync(
  [Buffer.from('seed'), payer.publicKey.toBuffer()],
  SystemProgram.programId
);
console.log('PDA:', pda.toBase58());
console.log('equal?', pda.equals(recipient));

// Sysvars & signature status
console.log(SYSVAR_RENT_PUBKEY.toBase58());
const statuses = await connection.getSignatureStatuses([txSig]);
const simResult = await connection.simulateTransaction(tx);
`;

function toRawGitHubUrl(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.startsWith("https://raw.githubusercontent.com/")) return trimmed;
  const blobMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
  if (blobMatch) {
    const [, owner, repo, branch, path] = blobMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }
  const rawMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.+)$/);
  if (rawMatch) {
    const [, owner, repo, branch, path] = rawMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }
  return null;
}

function isLikelyCode(text: string): boolean {
  return text.includes("import") || text.includes("const ") || text.includes("function ") || text.includes("export ");
}

function CopyButton({ text, label = "copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className="text-xs font-mono px-2 py-1 rounded bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-all"
    >
      {copied ? "copied!" : label}
    </button>
  );
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function generateAIPrompt(migratedCode: string, stats: { automaticChanges: number; aiRequiredChanges: number; totalChanges: number; coveragePercent: number }): string {
  return `You are helping migrate Solana code from @solana/web3.js v1 to @solana/kit.

The automated codemod (solana-kit-migrator) has already handled ${stats.automaticChanges} of ${stats.totalChanges} patterns automatically (${stats.coveragePercent}% coverage). ${stats.aiRequiredChanges} pattern${stats.aiRequiredChanges === 1 ? "" : "s"} need${stats.aiRequiredChanges === 1 ? "s" : ""} structural rewrites — they are marked with /* TODO: AI_REQUIRED */ in the code below.

PARTIALLY MIGRATED CODE:
\`\`\`typescript
${migratedCode}
\`\`\`

Please fix all /* TODO: AI_REQUIRED */ comments using the correct @solana/kit APIs:

**Transaction building (pipe-based functional pattern):**
\`\`\`typescript
import { pipe } from "@solana/functional";
import { createTransactionMessage, appendTransactionMessageInstructions, setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash } from "@solana/transaction-messages";

const tx = pipe(
  createTransactionMessage({ version: 0 }),
  (tx) => setTransactionMessageFeePayerSigner(payerSigner, tx),
  (tx) => setTransactionMessageLifetimeUsingBlockhash({ blockhash, lastValidBlockHeight }, tx),
  (tx) => appendTransactionMessageInstructions([instruction1, instruction2], tx),
);
\`\`\`

**Sending & confirming transactions:**
\`\`\`typescript
import { sendAndConfirmTransactionFactory } from "@solana/transaction-confirmation";
const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc });
const signature = await sendAndConfirm(tx, { commitment: "confirmed" });
\`\`\`

**Sending raw transactions:**
\`\`\`typescript
import { getBase64EncodedWireTransaction } from "@solana/transactions";
import { sendTransactionFactory } from "@solana/rpc";
const sendTx = sendTransactionFactory({ rpc });
const encoded = getBase64EncodedWireTransaction(compiledTx);
const sig = await sendTx(encoded, { commitment: "confirmed" });
\`\`\`

**Confirming by signature:**
\`\`\`typescript
const { value: statuses } = await rpc.getSignatureStatuses([signature]).send();
const confirmed = statuses[0]?.confirmationStatus === "confirmed";
\`\`\`

**Durable nonces:**
\`\`\`typescript
import { setTransactionMessageLifetimeUsingDurableNonce } from "@solana/transaction-messages";
const { value: nonceAccount } = await rpc.getAccountInfo(nonceAddress, { encoding: "base64" }).send();
const tx = pipe(msg, (tx) => setTransactionMessageLifetimeUsingDurableNonce({ nonce, nonceAccountAddress, nonceAuthorityAddress }, tx));
\`\`\`

Return only the corrected code with all /* TODO: AI_REQUIRED */ sections replaced by working @solana/kit code. Do not include explanation outside the code block.`;
}

function encodeShare(code: string): string { try { return btoa(encodeURIComponent(code)); } catch { return ""; } }
function decodeShare(encoded: string): string { try { return decodeURIComponent(atob(encoded)); } catch { return ""; } }

function ShareButton({ code }: { code: string }) {
  const [shared, setShared] = useState(false);
  return (
    <button
      onClick={() => {
        const url = `${window.location.origin}${window.location.pathname}#code=${encodeShare(code)}`;
        navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }}
      className="text-xs font-mono px-2 py-1 rounded bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-all"
    >
      {shared ? "link copied!" : "share"}
    </button>
  );
}

// ── Diff engine ──────────────────────────────────────────────────────────────
type DiffLine = { type: "same" | "add" | "remove" | "ai"; text: string };

function buildLineDiff(before: string, after: string): { left: DiffLine[]; right: DiffLine[] } {
  const a = before.split("\n");
  const b = after.split("\n");

  if (a.length > 500 || b.length > 500) {
    return {
      left: a.map((t) => ({ type: "same" as const, text: t })),
      right: b.map((t) => ({ type: (t.includes("TODO:") ? "ai" : "same") as const, text: t })),
    };
  }

  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  type Op = { t: "eq" | "del" | "ins"; a?: string; b?: string };
  const ops: Op[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.unshift({ t: "eq", a: a[i - 1], b: b[j - 1] }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ t: "ins", b: b[j - 1] }); j--;
    } else {
      ops.unshift({ t: "del", a: a[i - 1] }); i--;
    }
  }

  const left: DiffLine[] = [];
  const right: DiffLine[] = [];
  for (let k = 0; k < ops.length; k++) {
    const op = ops[k];
    if (op.t === "eq") {
      left.push({ type: "same", text: op.a! });
      right.push({ type: "same", text: op.b! });
    } else if (op.t === "del") {
      const next = ops[k + 1];
      if (next?.t === "ins") {
        left.push({ type: "remove", text: op.a! });
        right.push({ type: next.b!.includes("TODO:") ? "ai" : "add", text: next.b! });
        k++;
      } else {
        left.push({ type: "remove", text: op.a! });
        right.push({ type: "same", text: "" });
      }
    } else {
      left.push({ type: "same", text: "" });
      right.push({ type: op.b!.includes("TODO:") ? "ai" : "add", text: op.b! });
    }
  }
  return { left, right };
}

function DiffLineEl({ line, lineNum }: { line: DiffLine; lineNum: number | null }) {
  const bg =
    line.type === "remove" ? "bg-red-500/12" :
    line.type === "add"    ? "bg-green-500/12" :
    line.type === "ai"     ? "bg-amber-500/12" : "";
  const text =
    line.type === "remove" ? "text-red-300" :
    line.type === "add"    ? "text-green-300" :
    line.type === "ai"     ? "text-amber-300" : "text-foreground/75";
  const marker =
    line.type === "remove" ? <span className="text-red-400 select-none mr-1">−</span> :
    line.type === "add"    ? <span className="text-green-400 select-none mr-1">+</span> :
    line.type === "ai"     ? <span className="text-amber-400 select-none mr-1">!</span> :
    <span className="select-none mr-1 opacity-0">·</span>;

  return (
    <div className={cn("flex items-start font-mono text-xs leading-5 px-2 min-h-[1.25rem]", bg)}>
      {lineNum !== null ? (
        <span className="select-none text-muted-foreground/30 w-7 shrink-0 text-right pr-2">{lineNum}</span>
      ) : (
        <span className="select-none w-7 shrink-0" />
      )}
      {marker}
      <span className={cn("whitespace-pre-wrap break-all", text)}>{line.text}</span>
    </div>
  );
}

type TabId = "output" | "diff" | "transforms" | "compile";
type FetchState = "idle" | "loading" | "error";
type CompileState = TsCheckResult | "loading" | null;

const GITHUB_EXAMPLES = [
  { label: "example-helloworld/hello_world.ts", url: "https://github.com/solana-labs/example-helloworld/blob/master/src/client/hello_world.ts" },
  { label: "solana-cookbook/get-account-info.ts", url: "https://github.com/solana-developers/solana-cookbook/blob/master/code/core-concepts/accounts/get-account-info.en.ts" },
  { label: "program-examples/transfer-sol.ts", url: "https://github.com/solana-developers/program-examples/blob/main/basics/transfer-sol/native/tests/transfer-sol.test.ts" },
  { label: "program-examples/create-account.ts", url: "https://github.com/solana-developers/program-examples/blob/main/basics/create-account/native/tests/create-account.test.ts" },
];

export function Playground() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showGithubInput, setShowGithubInput] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [fetchError, setFetchError] = useState("");
  const [fetchedFilename, setFetchedFilename] = useState("");
  const [isAutoMigrating, setIsAutoMigrating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const getInitialCode = () => {
    const hash = window.location.hash;
    const match = hash.match(/[#&]code=([^&]+)/);
    if (match) { const d = decodeShare(match[1]); if (d) return d; }
    return SAMPLE_CODE;
  };

  const [code, setCode] = useState(getInitialCode);
  const [result, setResult] = useState<ReturnType<typeof migrateCode> | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("output");
  const [compileState, setCompileState] = useState<CompileState>(null);

  // Auto-migrate on load if hash present
  useEffect(() => {
    if (window.location.hash.includes("code=")) {
      setResult(migrateCode(getInitialCode()));
    }
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+Enter → migrate instantly
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (code.trim()) {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          setIsAutoMigrating(false);
          const r = migrateCode(code);
          setResult(r);
          setActiveTab("output");
          window.history.replaceState(null, "", `${window.location.pathname}#code=${encodeShare(code)}`);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [code]);

  // Debounced real-time migration as user types
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!newCode.trim()) { setResult(null); setIsAutoMigrating(false); return; }
    setIsAutoMigrating(true);
    debounceRef.current = setTimeout(() => {
      setResult(migrateCode(newCode));
      setIsAutoMigrating(false);
    }, 600);
  }, []);

  const handleMigrate = () => {
    if (!code.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsAutoMigrating(false);
    const r = migrateCode(code);
    setResult(r);
    setActiveTab("output");
    window.history.replaceState(null, "", `${window.location.pathname}#code=${encodeShare(code)}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCode(text);
      setFetchedFilename(file.name);
      const r = migrateCode(text);
      setResult(r);
      setActiveTab("output");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCode(text);
      setFetchedFilename(file.name);
      const r = migrateCode(text);
      setResult(r);
      setActiveTab("output");
    };
    reader.readAsText(file);
  };

  const fetchGithubFile = async (urlInput: string) => {
    const rawUrl = toRawGitHubUrl(urlInput);
    if (!rawUrl) { setFetchState("error"); setFetchError("Not a recognised GitHub file URL. Use a /blob/ link."); return; }
    const ext = rawUrl.split("?")[0].split(".").pop()?.toLowerCase();
    if (!ext || !["ts", "tsx", "js", "jsx", "mjs"].includes(ext)) { setFetchState("error"); setFetchError("Only .ts, .tsx, .js, .jsx, and .mjs files are supported."); return; }
    setFetchState("loading"); setFetchError("");
    try {
      const res = await fetch(rawUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!isLikelyCode(text)) { setFetchState("error"); setFetchError("File doesn't look like TypeScript/JavaScript."); return; }
      const filename = rawUrl.split("/").pop() ?? "file.ts";
      setCode(text);
      setFetchedFilename(filename);
      setFetchState("idle");
      setShowGithubInput(false);
      setGithubUrl("");
      const r = migrateCode(text);
      setResult(r);
      setActiveTab("diff");
    } catch (err) {
      setFetchState("error");
      setFetchError(`Failed to fetch: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleGithubSubmit = (e: React.FormEvent) => { e.preventDefault(); if (githubUrl.trim()) fetchGithubFile(githubUrl.trim()); };

  const allTransforms: TransformDetail[] = result?.transforms ?? [];
  const visibleTransforms = categoryFilter ? allTransforms.filter((t) => t.category === categoryFilter) : allTransforms;
  const autoTransforms = visibleTransforms.filter((t) => !t.flaggedForAI);
  const aiTransforms = visibleTransforms.filter((t) => t.flaggedForAI);

  const diff = result ? buildLineDiff(code, result.transformedCode) : null;

  // Count changes by category
  const changedLineCount = diff ? diff.right.filter((l) => l.type !== "same").length : 0;

  // Run TypeScript compiler check when compile tab becomes active
  useEffect(() => {
    if (activeTab !== "compile" || !result) return;
    setCompileState("loading");
    checkTypeScript(result.transformedCode)
      .then((r) => setCompileState(r))
      .catch(() => setCompileState({ valid: false, errors: ["Compiler unavailable in this environment"], js: "" }));
  }, [activeTab, result]);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-border px-4 py-2.5 flex items-center justify-between gap-3 bg-background shrink-0 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setCode(SAMPLE_CODE); setResult(null); setFetchedFilename(""); setIsAutoMigrating(false); window.history.replaceState(null, "", window.location.pathname); }}
            className="text-xs font-mono px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            sample
          </button>

          <button
            onClick={() => { setShowGithubInput((v) => !v); setFetchState("idle"); setFetchError(""); }}
            className={cn(
              "text-xs font-mono px-3 py-1.5 rounded border transition-all flex items-center gap-1.5",
              showGithubInput ? "border-primary/50 text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            from GitHub
          </button>

          <button onClick={() => fileInputRef.current?.click()} className="text-xs font-mono px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
            upload file
          </button>
          <input ref={fileInputRef} type="file" accept=".ts,.tsx,.js,.jsx,.mjs" className="hidden" onChange={handleFileUpload} />

          <button
            onClick={() => { setCode(""); setResult(null); setFetchedFilename(""); setIsAutoMigrating(false); window.history.replaceState(null, "", window.location.pathname); }}
            className="text-xs font-mono px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            clear
          </button>

          {fetchedFilename && (
            <span className="text-xs font-mono text-primary/70 border border-primary/20 bg-primary/5 px-2 py-1 rounded">{fetchedFilename}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground/40 hidden sm:inline">⌘↵ to migrate</span>
          <button
            onClick={handleMigrate}
            disabled={!code.trim()}
            className={cn(
              "px-5 py-2 rounded font-mono text-sm font-medium transition-all flex items-center gap-2 shrink-0",
              !code.trim() ? "bg-primary/40 text-primary-foreground/50 cursor-not-allowed" : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isAutoMigrating ? (
              <>
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4" strokeDashoffset="10"/>
                </svg>
                migrating…
              </>
            ) : (
              <>
                Migrate
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {/* GitHub panel */}
      {showGithubInput && (
        <div className="border-b border-border bg-card/60 px-4 py-3 shrink-0 space-y-3">
          <form onSubmit={handleGithubSubmit} className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => { setGithubUrl(e.target.value); setFetchState("idle"); setFetchError(""); }}
                placeholder="https://github.com/owner/repo/blob/main/src/client.ts"
                className="w-full text-xs font-mono px-3 py-2 rounded border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                autoFocus
                disabled={fetchState === "loading"}
              />
            </div>
            <button
              type="submit"
              disabled={!githubUrl.trim() || fetchState === "loading"}
              className={cn(
                "text-xs font-mono px-4 py-2 rounded transition-all shrink-0",
                fetchState === "loading" ? "bg-primary/40 text-primary-foreground/50 cursor-wait" : !githubUrl.trim() ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {fetchState === "loading" ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4" strokeDashoffset="10"/>
                  </svg>
                  fetching…
                </span>
              ) : "Fetch & Migrate"}
            </button>
          </form>
          {fetchState === "error" && (
            <div className="text-xs font-mono text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{fetchError}</div>
          )}
          <div className="space-y-1">
            <div className="text-xs font-mono text-muted-foreground/50 uppercase tracking-wider">Try a real example:</div>
            <div className="flex flex-wrap gap-2">
              {GITHUB_EXAMPLES.map((ex) => (
                <button
                  key={ex.url}
                  onClick={() => fetchGithubFile(ex.url)}
                  disabled={fetchState === "loading"}
                  className="text-xs font-mono px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all truncate max-w-xs"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="flex-1 grid grid-cols-2 min-h-0 divide-x divide-border" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
        {/* Input panel */}
        <div className="flex flex-col min-h-0">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-card/50 shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-red-400/70" />
              web3.js v1 input
              <span className="text-muted-foreground/40 hidden sm:inline">— drag & drop a file</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShareButton code={code} />
              <CopyButton text={code} />
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="flex-1 p-4 bg-background text-xs font-mono text-foreground resize-none focus:outline-none leading-relaxed"
            placeholder="Paste your @solana/web3.js v1 code here, upload a file, fetch from GitHub, or drag & drop…"
            spellCheck={false}
          />
        </div>

        {/* Output panel */}
        <div className="flex flex-col min-h-0">
          {/* Tab bar */}
          <div className="border-b border-border flex items-center justify-between bg-card/50 shrink-0 px-0">
            <div className="flex">
              {(["output", "diff", "transforms", "compile"] as TabId[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-4 py-2.5 text-xs font-mono border-b-2 transition-all",
                    activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "transforms"
                    ? `transforms${allTransforms.length > 0 ? ` (${allTransforms.length})` : ""}`
                    : tab === "diff"
                    ? `diff${changedLineCount > 0 ? ` (${changedLineCount})` : ""}`
                    : tab === "compile"
                    ? compileState && compileState !== "loading"
                      ? compileState.valid ? "compile ✓" : `compile ✗`
                      : "compile"
                    : "@solana/kit output"}
                </button>
              ))}
            </div>
            {result && (
              <div className="pr-3 flex items-center gap-1.5">
                {result.stats.aiRequiredChanges > 0 && (
                  <CopyButton
                    text={generateAIPrompt(result.transformedCode, result.stats)}
                    label="copy AI prompt"
                  />
                )}
                <CopyButton text={result.transformedCode} label="copy output" />
                <button
                  onClick={() => downloadFile(result.transformedCode, fetchedFilename ? `migrated-${fetchedFilename}` : "migrated.ts")}
                  className="text-xs font-mono px-2 py-1 rounded bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-all"
                >
                  download
                </button>
              </div>
            )}
          </div>

          {/* Stats bar */}
          {result && (
            <div className="px-3 py-2 border-b border-border bg-card/30 flex items-center gap-2 text-xs font-mono shrink-0 flex-wrap">
              <span className="text-primary font-bold">{result.stats.coveragePercent}% automated</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-green-400">{result.stats.automaticChanges} auto</span>
              {result.stats.aiRequiredChanges > 0 && (
                <><span className="text-muted-foreground/40">·</span><span className="text-amber-400">{result.stats.aiRequiredChanges} AI</span></>
              )}
              <span className="text-muted-foreground/40">·</span>
              <div className="flex items-center gap-1 flex-wrap">
                {Object.entries(result.stats.byCategory).map(([cat, count]) => (
                  <button
                    key={cat}
                    onClick={() => { setActiveTab("transforms"); setCategoryFilter(categoryFilter === cat ? null : cat); }}
                    className={cn(
                      "text-xs font-mono px-1.5 py-0.5 rounded border transition-all",
                      categoryFilter === cat
                        ? (CATEGORY_COLORS[cat] ?? "text-foreground bg-muted border-border") + " opacity-100"
                        : "border-border text-muted-foreground/50 hover:text-muted-foreground hover:border-border/80"
                    )}
                  >
                    {cat}:{count}
                  </button>
                ))}
                {categoryFilter && (
                  <button onClick={() => setCategoryFilter(null)} className="text-xs font-mono text-muted-foreground/40 hover:text-muted-foreground underline">clear</button>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto">
            {/* OUTPUT TAB */}
            {activeTab === "output" && (
              result ? (
                <pre className="p-4 text-xs font-mono text-foreground leading-relaxed whitespace-pre-wrap">{result.transformedCode}</pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                  <div className="w-12 h-12 rounded-xl border border-border flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M2 10h16M10 2l8 8-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-foreground"/>
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-mono text-muted-foreground">Start typing to auto-migrate</p>
                    <p className="text-xs font-mono text-muted-foreground/50">or press <kbd className="px-1 py-0.5 rounded border border-border bg-muted text-xs">⌘↵</kbd> to run instantly</p>
                  </div>
                </div>
              )
            )}

            {/* DIFF TAB */}
            {activeTab === "diff" && (
              diff ? (
                <div className="flex h-full">
                  {/* Left: original */}
                  <div className="flex-1 min-w-0 border-r border-border overflow-auto">
                    <div className="sticky top-0 px-3 py-1.5 text-xs font-mono text-muted-foreground bg-card/80 border-b border-border flex items-center gap-2 backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> web3.js v1 (before)
                    </div>
                    <div>
                      {diff.left.map((line, idx) => {
                        const lineNum = diff.left.slice(0, idx).filter((l) => l.text !== "" || l.type !== "same").length + (line.text !== "" || line.type !== "same" ? 1 : null);
                        return <DiffLineEl key={idx} line={line} lineNum={idx + 1} />;
                      })}
                    </div>
                  </div>
                  {/* Right: migrated */}
                  <div className="flex-1 min-w-0 overflow-auto">
                    <div className="sticky top-0 px-3 py-1.5 text-xs font-mono text-muted-foreground bg-card/80 border-b border-border flex items-center gap-2 backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> @solana/kit (after)
                      {diff.right.filter((l) => l.type === "ai").length > 0 && (
                        <span className="text-amber-400/70 ml-2">{diff.right.filter((l) => l.type === "ai").length} AI-flagged</span>
                      )}
                    </div>
                    <div>
                      {diff.right.map((line, idx) => (
                        <DiffLineEl key={idx} line={line} lineNum={idx + 1} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
                  <p className="text-xs font-mono text-muted-foreground">Run a migration to see the diff</p>
                </div>
              )
            )}

            {/* COMPILE TAB */}
            {activeTab === "compile" && (
              <div className="flex-1 overflow-auto p-5 font-mono text-xs space-y-5">
                {!result ? (
                  <div className="text-muted-foreground">Migrate code first to check TypeScript compilation.</div>
                ) : compileState === "loading" ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <svg className="animate-spin shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10"/>
                    </svg>
                    Loading TypeScript compiler…
                  </div>
                ) : compileState === null ? null : compileState.valid ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5 text-green-400">
                      <div className="w-5 h-5 rounded-full bg-green-400/15 border border-green-400/30 flex items-center justify-center shrink-0">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2 2 4-4" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="font-semibold">TypeScript transpiles successfully</span>
                    </div>
                    <div className="pl-7 text-muted-foreground/60 space-y-1">
                      <div>✓ Valid TypeScript syntax — no parse or transpile errors</div>
                      <div>✓ All import statements are structurally correct</div>
                      <div>✓ Type annotations and generics are well-formed</div>
                      <div className="pt-1 text-muted-foreground/40">
                        Note: Full type resolution requires <code className="text-primary/70">@solana/kit</code> packages installed locally.
                        This check validates syntax and transpilability — the guarantee that matters most for automated migration.
                      </div>
                    </div>
                    {compileState.js && (
                      <details className="group mt-2">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none list-none flex items-center gap-1.5">
                          <svg className="transition-transform group-open:rotate-90" width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          View transpiled JavaScript output
                        </summary>
                        <pre className="mt-3 p-3 rounded border border-border bg-card text-green-400/70 overflow-auto max-h-96 text-xs leading-relaxed whitespace-pre-wrap">
                          {compileState.js}
                        </pre>
                      </details>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5 text-red-400">
                      <div className="w-5 h-5 rounded-full bg-red-400/15 border border-red-400/30 flex items-center justify-center shrink-0">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M3 3l4 4M7 3l-4 4" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <span className="font-semibold">{compileState.errors.length} syntax error{compileState.errors.length !== 1 ? "s" : ""} detected</span>
                    </div>
                    <div className="pl-7 space-y-2">
                      {compileState.errors.map((err, i) => (
                        <div key={i} className="text-red-400/80 bg-red-400/5 border border-red-400/15 rounded px-3 py-2">{err}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TRANSFORMS TAB */}
            {activeTab === "transforms" && (
              <div className="p-4 space-y-3">
                {allTransforms.length === 0 ? (
                  <p className="text-xs font-mono text-muted-foreground">Run a migration to see transforms.</p>
                ) : (
                  <>
                    {autoTransforms.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider pb-1 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          Automated ({autoTransforms.length})
                          {categoryFilter && <span className="text-primary/60 normal-case">filtered by: {categoryFilter}</span>}
                        </div>
                        {autoTransforms.map((t, i) => (
                          <div key={i} className="p-3 rounded border border-border bg-card space-y-2">
                            <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded border inline-block", CATEGORY_COLORS[t.category] ?? "text-foreground bg-muted border-border")}>
                              {t.category}
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-muted-foreground font-mono mb-1">before</div>
                                <pre className="text-xs font-mono text-red-400/80 whitespace-pre-wrap break-all leading-relaxed">{t.original}</pre>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground font-mono mb-1">after</div>
                                <pre className="text-xs font-mono text-green-400/80 whitespace-pre-wrap break-all leading-relaxed">{t.transformed}</pre>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {aiTransforms.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2 pb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <div className="text-xs font-mono text-amber-400/70 uppercase tracking-wider">AI Required ({aiTransforms.length})</div>
                          <div className="text-xs font-mono text-muted-foreground/50">— structural rewrites need manual review</div>
                        </div>
                        {aiTransforms.map((t, i) => (
                          <div key={i} className="p-3 rounded border border-amber-400/20 bg-amber-400/5 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded border inline-block", CATEGORY_COLORS[t.category] ?? "text-foreground bg-muted border-border")}>
                                {t.category}
                              </span>
                              <span className="text-xs font-mono text-amber-400 px-1.5 py-0.5 rounded border border-amber-400/20 bg-amber-400/10">AI Required</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-muted-foreground font-mono mb-1">before</div>
                                <pre className="text-xs font-mono text-red-400/60 whitespace-pre-wrap break-all leading-relaxed">{t.original}</pre>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground font-mono mb-1">guidance</div>
                                <pre className="text-xs font-mono text-amber-400/70 whitespace-pre-wrap break-all leading-relaxed">{t.transformed.replace(/\/\*\s*TODO:\s*AI_REQUIRED\s*—\s*/g, "").replace(/\s*\*\//g, "")}</pre>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
