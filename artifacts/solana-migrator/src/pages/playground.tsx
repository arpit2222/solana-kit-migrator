import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { migrateCode, type TransformDetail } from "@/lib/migrator";

const CATEGORY_COLORS: Record<string, string> = {
  imports: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  connection: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  keypair: "text-green-400 bg-green-400/10 border-green-400/20",
  publickey: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  transaction: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  buffer: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  lamports: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

const SAMPLE_CODE = `import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import bs58 from 'bs58';

// Create connection
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Generate keypair
const payer = Keypair.generate();
const recipient = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Get balance
const balance = await connection.getBalance(payer.publicKey);
console.log(\`Balance: \${balance / LAMPORTS_PER_SOL} SOL\`);

// Encode
const encoded = bs58.encode(Buffer.from('hello world'));

// Build transaction (auto-migrated parts)
let tx = new Transaction();
tx.feePayer = payer.publicKey;
tx.recentBlockhash = blockhash;
tx = tx.add(transferIx);

// Complex send (flagged for AI)
await sendAndConfirmTransaction(connection, tx, [payer]);

// PDA
const [pda] = PublicKey.findProgramAddressSync(
  [Buffer.from('seed'), payer.publicKey.toBuffer()],
  SystemProgram.programId
);
console.log('PDA:', pda.toBase58());

// Sysvar
console.log(SYSVAR_RENT_PUBKEY.toBase58());
`;

// Convert any GitHub URL form to a raw.githubusercontent.com URL
function toRawGitHubUrl(input: string): string | null {
  const trimmed = input.trim();

  // Already raw
  if (trimmed.startsWith("https://raw.githubusercontent.com/")) return trimmed;

  // https://github.com/owner/repo/blob/branch/path → raw
  const blobMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/
  );
  if (blobMatch) {
    const [, owner, repo, branch, path] = blobMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }

  // https://github.com/owner/repo/raw/branch/path
  const rawMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.+)$/
  );
  if (rawMatch) {
    const [, owner, repo, branch, path] = rawMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }

  return null;
}

function isLikelyCode(text: string): boolean {
  return (
    text.includes("import") ||
    text.includes("const ") ||
    text.includes("function ") ||
    text.includes("export ")
  );
}

function CopyButton({ text, label = "copy" }: { text: string; label?: string }) {
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
      {copied ? "copied!" : label}
    </button>
  );
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function encodeShare(code: string): string {
  try { return btoa(encodeURIComponent(code)); } catch { return ""; }
}
function decodeShare(encoded: string): string {
  try { return decodeURIComponent(atob(encoded)); } catch { return ""; }
}

function ShareButton({ code }: { code: string }) {
  const [shared, setShared] = useState(false);
  const handleShare = () => {
    const encoded = encodeShare(code);
    const url = `${window.location.origin}${window.location.pathname}#code=${encoded}`;
    navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };
  return (
    <button
      onClick={handleShare}
      className="text-xs font-mono px-2 py-1 rounded bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-all"
    >
      {shared ? "link copied!" : "share"}
    </button>
  );
}

type TabId = "output" | "transforms";
type FetchState = "idle" | "loading" | "error";

// GitHub examples users can click to try instantly
const GITHUB_EXAMPLES = [
  {
    label: "example-helloworld/hello_world.ts",
    url: "https://github.com/solana-labs/example-helloworld/blob/master/src/client/hello_world.ts",
  },
  {
    label: "solana-cookbook/get-account-info.ts",
    url: "https://github.com/solana-developers/solana-cookbook/blob/master/code/core-concepts/accounts/get-account-info.en.ts",
  },
  {
    label: "program-examples/transfer-sol.ts",
    url: "https://github.com/solana-developers/program-examples/blob/main/basics/transfer-sol/native/tests/transfer-sol.test.ts",
  },
];

export function Playground() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showGithubInput, setShowGithubInput] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [fetchError, setFetchError] = useState("");
  const [fetchedFilename, setFetchedFilename] = useState("");

  const getInitialCode = () => {
    const hash = window.location.hash;
    const match = hash.match(/[#&]code=([^&]+)/);
    if (match) {
      const decoded = decodeShare(match[1]);
      if (decoded) return decoded;
    }
    return SAMPLE_CODE;
  };

  const [code, setCode] = useState(getInitialCode);
  const [result, setResult] = useState<ReturnType<typeof migrateCode> | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("output");

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("code=")) {
      const r = migrateCode(getInitialCode());
      setResult(r);
    }
  }, []);

  const handleMigrate = () => {
    if (!code.trim()) return;
    const r = migrateCode(code);
    setResult(r);
    setActiveTab("output");
    const encoded = encodeShare(code);
    window.history.replaceState(null, "", `${window.location.pathname}#code=${encoded}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCode(ev.target?.result as string);
      setResult(null);
      setFetchedFilename(file.name);
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
      setCode(ev.target?.result as string);
      setResult(null);
      setFetchedFilename(file.name);
    };
    reader.readAsText(file);
  };

  const fetchGithubFile = async (urlInput: string) => {
    const rawUrl = toRawGitHubUrl(urlInput);
    if (!rawUrl) {
      setFetchState("error");
      setFetchError("Not a recognised GitHub file URL. Use a /blob/ link like: github.com/owner/repo/blob/main/file.ts");
      return;
    }

    // Only allow .ts/.tsx/.js/.jsx/.mjs files
    const ext = rawUrl.split("?")[0].split(".").pop()?.toLowerCase();
    if (!ext || !["ts", "tsx", "js", "jsx", "mjs"].includes(ext)) {
      setFetchState("error");
      setFetchError("Only .ts, .tsx, .js, .jsx, and .mjs files are supported.");
      return;
    }

    setFetchState("loading");
    setFetchError("");
    try {
      const res = await fetch(rawUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!isLikelyCode(text)) {
        setFetchState("error");
        setFetchError("File fetched but doesn't look like TypeScript/JavaScript. Check the URL points to a source file.");
        return;
      }
      const filename = rawUrl.split("/").pop() ?? "file.ts";
      setCode(text);
      setResult(null);
      setFetchedFilename(filename);
      setFetchState("idle");
      setShowGithubInput(false);
      setGithubUrl("");
      // Auto-migrate
      const r = migrateCode(text);
      setResult(r);
      setActiveTab("output");
    } catch (err) {
      setFetchState("error");
      setFetchError(`Failed to fetch: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleGithubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (githubUrl.trim()) fetchGithubFile(githubUrl.trim());
  };

  const transforms: TransformDetail[] = result?.transforms ?? [];
  const autoTransforms = transforms.filter((t) => !t.flaggedForAI);
  const aiTransforms = transforms.filter((t) => t.flaggedForAI);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-border px-4 py-2.5 flex items-center justify-between gap-3 bg-background shrink-0 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setCode(SAMPLE_CODE);
              setResult(null);
              setFetchedFilename("");
              window.history.replaceState(null, "", window.location.pathname);
            }}
            className="text-xs font-mono px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            sample
          </button>

          {/* GitHub URL button */}
          <button
            onClick={() => { setShowGithubInput((v) => !v); setFetchState("idle"); setFetchError(""); }}
            className={cn(
              "text-xs font-mono px-3 py-1.5 rounded border transition-all flex items-center gap-1.5",
              showGithubInput
                ? "border-primary/50 text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            from GitHub
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-mono px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            upload file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ts,.tsx,.js,.jsx,.mjs"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => {
              setCode("");
              setResult(null);
              setFetchedFilename("");
              window.history.replaceState(null, "", window.location.pathname);
            }}
            className="text-xs font-mono px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            clear
          </button>

          {fetchedFilename && (
            <span className="text-xs font-mono text-primary/70 border border-primary/20 bg-primary/5 px-2 py-1 rounded">
              {fetchedFilename}
            </span>
          )}
        </div>

        <button
          onClick={handleMigrate}
          disabled={!code.trim()}
          className={cn(
            "px-5 py-2 rounded font-mono text-sm font-medium transition-all flex items-center gap-2 shrink-0",
            !code.trim()
              ? "bg-primary/40 text-primary-foreground/50 cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          Migrate
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* GitHub URL input panel */}
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
                fetchState === "loading"
                  ? "bg-primary/40 text-primary-foreground/50 cursor-wait"
                  : !githubUrl.trim()
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
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
            <div className="text-xs font-mono text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
              {fetchError}
            </div>
          )}

          {/* Quick examples */}
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

      {/* Panels */}
      <div
        className="flex-1 grid grid-cols-2 min-h-0 divide-x divide-border"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Input */}
        <div className="flex flex-col min-h-0">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-card/50 shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-red-400/70" />
              web3.js v1 input
              <span className="text-muted-foreground/40 text-xs hidden sm:inline">— drag & drop a file</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShareButton code={code} />
              <CopyButton text={code} />
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => { setCode(e.target.value); }}
            className="flex-1 p-4 bg-background text-xs font-mono text-foreground resize-none focus:outline-none leading-relaxed"
            placeholder="Paste your @solana/web3.js v1 code here, upload a file, fetch from GitHub, or drag & drop..."
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="flex flex-col min-h-0">
          <div className="border-b border-border flex items-center justify-between bg-card/50 shrink-0 px-0">
            <div className="flex">
              {(["output", "transforms"] as TabId[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-4 py-2.5 text-xs font-mono border-b-2 transition-all",
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "transforms"
                    ? `transforms${transforms.length > 0 ? ` (${transforms.length})` : ""}`
                    : "@solana/kit output"}
                </button>
              ))}
            </div>
            {result && (
              <div className="pr-3 flex items-center gap-1.5">
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

          {result && (
            <div className="px-4 py-2 border-b border-border bg-card/30 flex items-center gap-4 text-xs font-mono shrink-0 flex-wrap">
              <span className="text-primary font-bold">{result.stats.coveragePercent}% automated</span>
              <span className="text-green-400">{result.stats.automaticChanges} auto</span>
              {result.stats.aiRequiredChanges > 0 && (
                <span className="text-amber-400">{result.stats.aiRequiredChanges} need AI review</span>
              )}
              <span className="text-muted-foreground">{result.stats.totalChanges} total changes</span>
              {Object.entries(result.stats.byCategory).map(([cat, count]) => (
                <span key={cat} className="text-muted-foreground/60">{cat}:{count}</span>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-auto">
            {activeTab === "output" ? (
              result ? (
                <pre className="p-4 text-xs font-mono text-foreground leading-relaxed whitespace-pre-wrap">{result.transformedCode}</pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
                  <div className="w-10 h-10 rounded border border-border flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M2 9h14M9 2l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-foreground"/>
                    </svg>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">Paste, upload, or fetch from GitHub — then click Migrate</p>
                </div>
              )
            ) : (
              <div className="p-4 space-y-3">
                {transforms.length === 0 ? (
                  <p className="text-xs font-mono text-muted-foreground">Run a migration to see transforms.</p>
                ) : (
                  <>
                    {autoTransforms.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider pb-1">
                          Automated ({autoTransforms.length})
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
                          <div className="text-xs font-mono text-amber-400/70 uppercase tracking-wider">AI Required ({aiTransforms.length})</div>
                          <div className="text-xs font-mono text-muted-foreground/50">— structural rewrites need manual review</div>
                        </div>
                        {aiTransforms.map((t, i) => (
                          <div key={i} className="p-3 rounded border border-amber-400/20 bg-amber-400/5 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded border", CATEGORY_COLORS[t.category] ?? "")}>
                                {t.category}
                              </span>
                              <span className="text-xs font-mono text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded">AI Required</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-muted-foreground font-mono mb-1">detected</div>
                                <pre className="text-xs font-mono text-amber-400/70 whitespace-pre-wrap break-all leading-relaxed">{t.original}</pre>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground font-mono mb-1">guidance</div>
                                <pre className="text-xs font-mono text-amber-400/80 whitespace-pre-wrap break-all leading-relaxed">{t.transformed}</pre>
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
