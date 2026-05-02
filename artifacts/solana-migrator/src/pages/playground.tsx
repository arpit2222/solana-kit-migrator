import { useState, useRef } from "react";
import { useMigrateCode } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import type { TransformDetail } from "@workspace/api-client-react";

const CATEGORY_COLORS: Record<string, string> = {
  imports: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  connection: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  keypair: "text-green-400 bg-green-400/10 border-green-400/20",
  publickey: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  transaction: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  buffer: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  lamports: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

const SAMPLE_CODE = `import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
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
const encoded = bs58.encode(Buffer.from(payer.secretKey));

// Build transaction
const tx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: recipient,
    lamports: 0.001 * LAMPORTS_PER_SOL,
  })
);

// Send
await sendAndConfirmTransaction(connection, tx, [payer]);

// PDA
const [pda] = PublicKey.findProgramAddressSync(
  [Buffer.from('seed'), payer.publicKey.toBuffer()],
  SystemProgram.programId
);
console.log('PDA:', pda.toBase58());
`;

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

export function Playground() {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [filename, setFilename] = useState("index.ts");
  const [activeTab, setActiveTab] = useState<"output" | "transforms">("output");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { mutate, isPending, data, error } = useMigrateCode();

  const handleMigrate = () => {
    mutate({ code, filename });
  };

  const handleLoadSample = () => {
    setCode(SAMPLE_CODE);
    setFilename("index.ts");
  };

  const transforms: TransformDetail[] = data?.transforms ?? [];
  const autoTransforms = transforms.filter((t) => !t.flaggedForAI);
  const aiTransforms = transforms.filter((t) => t.flaggedForAI);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-border px-6 py-3 flex items-center justify-between gap-4 bg-background">
        <div className="flex items-center gap-3">
          <input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="text-xs font-mono bg-card border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:border-primary w-36"
            placeholder="filename.ts"
          />
          <button
            onClick={handleLoadSample}
            className="text-xs font-mono px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            load sample
          </button>
          <button
            onClick={() => setCode("")}
            className="text-xs font-mono px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            clear
          </button>
        </div>

        <button
          onClick={handleMigrate}
          disabled={isPending || !code.trim()}
          className={cn(
            "px-5 py-2 rounded font-mono text-sm font-medium transition-all flex items-center gap-2",
            isPending || !code.trim()
              ? "bg-primary/50 text-primary-foreground/50 cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isPending ? (
            <>
              <span className="w-3 h-3 rounded-full border border-primary-foreground/50 border-t-primary-foreground animate-spin" />
              migrating...
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

      {/* Main panels */}
      <div className="flex-1 grid grid-cols-2 min-h-0 divide-x divide-border">
        {/* Input */}
        <div className="flex flex-col min-h-0">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-card/50">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-red-400/60" />
              web3.js v1
            </div>
            <CopyButton text={code} />
          </div>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 p-4 bg-background text-xs font-mono text-foreground resize-none focus:outline-none leading-relaxed"
            placeholder="Paste your @solana/web3.js v1 code here..."
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="flex flex-col min-h-0">
          {/* Tabs */}
          <div className="px-4 py-0 border-b border-border flex items-center justify-between bg-card/50">
            <div className="flex">
              {[
                { id: "output" as const, label: "@solana/kit output" },
                { id: "transforms" as const, label: `transforms ${transforms.length > 0 ? `(${transforms.length})` : ""}` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-4 py-2.5 text-xs font-mono border-b-2 transition-all",
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {data && (
              <CopyButton text={data.transformedCode} label="copy output" />
            )}
          </div>

          {/* Stats bar */}
          {data && (
            <div className="px-4 py-2 border-b border-border bg-card/30 flex items-center gap-4 text-xs font-mono">
              <span className="text-primary font-bold">{data.stats.coveragePercent}% automated</span>
              <span className="text-green-400">{data.stats.automaticChanges} auto transforms</span>
              {data.stats.aiRequiredChanges > 0 && (
                <span className="text-amber-400">{data.stats.aiRequiredChanges} need AI review</span>
              )}
            </div>
          )}

          <div className="flex-1 overflow-auto">
            {activeTab === "output" ? (
              <div className="h-full">
                {error ? (
                  <div className="p-4 text-xs font-mono text-destructive">
                    Migration failed. Please check your input.
                  </div>
                ) : data ? (
                  <pre className="p-4 text-xs font-mono text-foreground leading-relaxed whitespace-pre-wrap min-h-full">
                    {data.transformedCode}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
                    <div className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 5h12M2 8h8M2 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">
                      Paste code on the left and click Migrate
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {transforms.length === 0 ? (
                  <p className="text-xs font-mono text-muted-foreground">No transforms yet. Run a migration first.</p>
                ) : (
                  <>
                    {autoTransforms.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider pb-1">
                          Automated ({autoTransforms.length})
                        </div>
                        {autoTransforms.map((t, i) => (
                          <div key={i} className="p-3 rounded border border-border bg-card space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded border", CATEGORY_COLORS[t.category] ?? "text-foreground bg-muted border-border")}>
                                {t.category}
                              </span>
                            </div>
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
                        <div className="text-xs font-mono text-amber-400/80 uppercase tracking-wider pb-1">
                          AI Required ({aiTransforms.length})
                        </div>
                        {aiTransforms.map((t, i) => (
                          <div key={i} className="p-3 rounded border border-amber-400/20 bg-amber-400/5 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono px-1.5 py-0.5 rounded border text-amber-400 bg-amber-400/10 border-amber-400/20">
                                {t.category}
                              </span>
                              <span className="text-xs font-mono text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded">
                                AI Required
                              </span>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground font-mono mb-1">flagged pattern</div>
                              <pre className="text-xs font-mono text-amber-400/80 whitespace-pre-wrap break-all leading-relaxed">{t.original}</pre>
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
