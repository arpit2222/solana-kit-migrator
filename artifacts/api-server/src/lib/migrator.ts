/**
 * Solana web3.js v1 → @solana/kit codemod engine
 *
 * Categories:
 *   A. imports       — package import rewrites
 *   B. connection    — Connection → RPC client
 *   C. keypair       — Keypair → KeyPairSigner
 *   D. publickey     — PublicKey → Address
 *   E. transaction   — Transaction model (complex, flagged for AI)
 *   F. buffer        — Buffer/bs58 encoding
 *   G. lamports      — Lamport/SOL utilities
 */

export interface TransformDetail {
  category: string;
  original: string;
  transformed: string;
  flaggedForAI: boolean;
  line?: number;
}

export interface MigrationStats {
  totalChanges: number;
  automaticChanges: number;
  aiRequiredChanges: number;
  coveragePercent: number;
  byCategory: Record<string, number>;
}

export interface MigrateResult {
  transformedCode: string;
  transforms: TransformDetail[];
  stats: MigrationStats;
}

// ─── Import map: old named import → { newPkg, newName? } ─────────────────────
const IMPORT_MAP: Record<string, { pkg: string; name?: string }> = {
  // RPC / Connection
  Connection: { pkg: "@solana/rpc" },
  // Keypair / Signer
  Keypair: { pkg: "@solana/signers" },
  // PublicKey / Address
  PublicKey: { pkg: "@solana/addresses", name: "Address" },
  // Transaction types
  Transaction: { pkg: "@solana/transactions" },
  TransactionInstruction: { pkg: "@solana/transactions" },
  SystemProgram: { pkg: "@solana/programs" },
  // Token
  TOKEN_PROGRAM_ID: { pkg: "@solana/spl-token", name: "TOKEN_PROGRAM_ADDRESS" },
  ASSOCIATED_TOKEN_PROGRAM_ID: { pkg: "@solana/spl-token", name: "ASSOCIATED_TOKEN_PROGRAM_ADDRESS" },
  // Encoding
  LAMPORTS_PER_SOL: { pkg: "@solana/kit" },
  // Utils
  sendAndConfirmTransaction: { pkg: "@solana/transactions" },
  clusterApiUrl: { pkg: "@solana/rpc" },
  // Buffer / encoding
  bs58: { pkg: "@solana/codecs", name: "getBase58Encoder" },
};

// Web3.js import packages to rewrite
const WEB3_PACKAGES = [
  "@solana/web3.js",
  "solana-web3.js",
];

interface Transform {
  pattern: RegExp;
  replacement: string | ((m: RegExpExecArray) => string);
  category: string;
  flaggedForAI?: boolean;
  description?: string;
}

const TRANSFORMS: Transform[] = [
  // ── B. Connection → RPC ───────────────────────────────────────────────────
  {
    category: "connection",
    pattern: /new\s+Connection\s*\(\s*([^)]+)\s*\)/g,
    replacement: (m) =>
      `createSolanaRpc(${m[1].trim()})`,
    description: "new Connection(url) → createSolanaRpc(url)",
  },
  {
    category: "connection",
    pattern: /(\w+)\.getBalance\s*\(\s*([^)]+)\s*\)/g,
    replacement: (m) =>
      `await ${m[1]}.getBalance(${m[2].trim()}).send()`,
    description: "connection.getBalance() → rpc.getBalance().send()",
  },
  {
    category: "connection",
    pattern: /(\w+)\.getAccountInfo\s*\(\s*([^)]+)\s*\)/g,
    replacement: (m) =>
      `await ${m[1]}.getAccountInfo(${m[2].trim()}).send()`,
    description: "connection.getAccountInfo() → rpc.getAccountInfo().send()",
  },
  {
    category: "connection",
    pattern: /(\w+)\.getTokenAccountBalance\s*\(\s*([^)]+)\s*\)/g,
    replacement: (m) =>
      `await ${m[1]}.getTokenAccountBalance(${m[2].trim()}).send()`,
    description: "connection.getTokenAccountBalance() → .send()",
  },
  {
    category: "connection",
    pattern: /(\w+)\.getTransaction\s*\(\s*([^)]+)\s*\)/g,
    replacement: (m) =>
      `await ${m[1]}.getTransaction(${m[2].trim()}).send()`,
    description: "connection.getTransaction() → .send()",
  },
  {
    category: "connection",
    pattern: /(\w+)\.getSlot\s*\(\s*\)/g,
    replacement: (m) =>
      `await ${m[1]}.getSlot().send()`,
    description: "connection.getSlot() → .send()",
  },
  {
    category: "connection",
    pattern: /clusterApiUrl\s*\(\s*(['"]\w+['"])\s*\)/g,
    replacement: (m) =>
      `createDefaultRpcTransport({ url: \`https://api.${m[1].replace(/['"]/g, '')}.solana.com\` })`,
    description: "clusterApiUrl() → transport URL",
  },

  // ── C. Keypair → KeyPairSigner ────────────────────────────────────────────
  {
    category: "keypair",
    pattern: /Keypair\.generate\s*\(\s*\)/g,
    replacement: "await generateKeyPairSigner()",
    description: "Keypair.generate() → await generateKeyPairSigner()",
  },
  {
    category: "keypair",
    pattern: /Keypair\.fromSecretKey\s*\(\s*([^)]+)\s*\)/g,
    replacement: (m) =>
      `await createKeyPairSignerFromBytes(${m[1].trim()})`,
    description: "Keypair.fromSecretKey(bytes) → await createKeyPairSignerFromBytes(bytes)",
  },
  {
    category: "keypair",
    pattern: /Keypair\.fromSeed\s*\(\s*([^)]+)\s*\)/g,
    replacement: (m) =>
      `await createKeyPairSignerFromBytes(${m[1].trim()})`,
    description: "Keypair.fromSeed() → createKeyPairSignerFromBytes()",
  },
  {
    category: "keypair",
    pattern: /(\w+)\.publicKey\b/g,
    replacement: (m) => `${m[1]}.address`,
    description: "keypair.publicKey → signer.address",
  },
  {
    category: "keypair",
    pattern: /(\w+)\.secretKey\b/g,
    replacement: (m) =>
      `${m[1]}.secretKey /* TODO: AI_REQUIRED — secretKey pattern deprecated in @solana/kit */`,
    flaggedForAI: true,
    description: "keypair.secretKey → flagged for AI (deprecated)",
  },

  // ── D. PublicKey → Address ────────────────────────────────────────────────
  {
    category: "publickey",
    pattern: /new\s+PublicKey\s*\(\s*([^)]+)\s*\)/g,
    replacement: (m) => `address(${m[1].trim()})`,
    description: "new PublicKey('abc') → address('abc')",
  },
  {
    category: "publickey",
    pattern: /PublicKey\.findProgramAddressSync\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g,
    replacement: (m) =>
      `await getProgramDerivedAddress({ programAddress: ${m[2].trim()}, seeds: ${m[1].trim()} })`,
    description: "PublicKey.findProgramAddressSync() → await getProgramDerivedAddress()",
  },
  {
    category: "publickey",
    pattern: /PublicKey\.findProgramAddress\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g,
    replacement: (m) =>
      `await getProgramDerivedAddress({ programAddress: ${m[2].trim()}, seeds: ${m[1].trim()} })`,
    description: "PublicKey.findProgramAddress() → await getProgramDerivedAddress()",
  },
  {
    category: "publickey",
    pattern: /PublicKey\.createWithSeed\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/g,
    replacement: (m) =>
      `/* TODO: AI_REQUIRED — createWithSeed(${m[1].trim()}, ${m[2].trim()}, ${m[3].trim()}) — use getAddressWithSeed() from @solana/addresses */`,
    flaggedForAI: true,
    description: "PublicKey.createWithSeed() → flagged for AI",
  },
  {
    category: "publickey",
    pattern: /SystemProgram\.programId\b/g,
    replacement: "SYSTEM_PROGRAM_ADDRESS",
    description: "SystemProgram.programId → SYSTEM_PROGRAM_ADDRESS",
  },
  {
    category: "publickey",
    pattern: /TOKEN_PROGRAM_ID\b/g,
    replacement: "TOKEN_PROGRAM_ADDRESS",
    description: "TOKEN_PROGRAM_ID → TOKEN_PROGRAM_ADDRESS",
  },
  {
    category: "publickey",
    pattern: /ASSOCIATED_TOKEN_PROGRAM_ID\b/g,
    replacement: "ASSOCIATED_TOKEN_PROGRAM_ADDRESS",
    description: "ASSOCIATED_TOKEN_PROGRAM_ID → ASSOCIATED_TOKEN_PROGRAM_ADDRESS",
  },
  {
    category: "publickey",
    pattern: /(\w+)\.toBase58\s*\(\s*\)/g,
    replacement: (m) => `${m[1]}`,
    description: "publicKey.toBase58() → address string directly",
  },
  {
    category: "publickey",
    pattern: /(\w+)\.toString\s*\(\s*\)\s*(?=\/\/.*key|\/\*.*key|(?=\s*(===|!==|==|!=)\s*['"][1-9A-HJ-NP-Za-km-z]{32,44}['"]))/g,
    replacement: (m) => `${m[1]}`,
    description: "publicKey.toString() → address string",
  },

  // ── E. Transaction model (flagged for AI) ────────────────────────────────
  {
    category: "transaction",
    pattern: /new\s+Transaction\s*\(\s*\)\s*\.add\s*\(/g,
    replacement:
      `/* TODO: AI_REQUIRED — new Transaction().add() → pipe(createTransaction({version: 0}), appendTransactionMessageInstructions([...])) */ appendTransactionMessageInstructions([`,
    flaggedForAI: true,
    description: "new Transaction().add() → flagged for AI (complex pipeline)",
  },
  {
    category: "transaction",
    pattern: /sendAndConfirmTransaction\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/g,
    replacement: (m) =>
      `/* TODO: AI_REQUIRED — sendAndConfirmTransaction → use sendAndConfirmTransactionFactory() from @solana/transactions */ sendAndConfirmTransactionFactory({ commitment: 'confirmed' })(${m[2].trim()}, [${m[3].trim()}])`,
    flaggedForAI: true,
    description: "sendAndConfirmTransaction() → sendAndConfirmTransactionFactory()",
  },
  {
    category: "transaction",
    pattern: /Transaction\.serialize\s*\(\s*\)/g,
    replacement:
      `/* TODO: AI_REQUIRED — Transaction.serialize() → use getTransactionEncoder() from @solana/transactions */`,
    flaggedForAI: true,
    description: "Transaction.serialize() → flagged for AI",
  },

  // ── F. Buffer / Borsh encoding ────────────────────────────────────────────
  {
    category: "buffer",
    pattern: /bs58\.encode\s*\(\s*([^)]+)\s*\)/g,
    replacement: (m) =>
      `getBase58Encoder().encode(${m[1].trim()})`,
    description: "bs58.encode() → getBase58Encoder().encode()",
  },
  {
    category: "buffer",
    pattern: /bs58\.decode\s*\(\s*([^)]+)\s*\)/g,
    replacement: (m) =>
      `getBase58Decoder().decode(${m[1].trim()})`,
    description: "bs58.decode() → getBase58Decoder().decode()",
  },
  {
    category: "buffer",
    pattern: /Buffer\.from\s*\(\s*([^)]+)\s*\)/g,
    replacement: (m) =>
      `new Uint8Array(${m[1].trim()})`,
    description: "Buffer.from() → new Uint8Array()",
  },
  {
    category: "buffer",
    pattern: /Buffer\.alloc\s*\(\s*([^)]+)\s*\)/g,
    replacement: (m) =>
      `new Uint8Array(${m[1].trim()})`,
    description: "Buffer.alloc() → new Uint8Array()",
  },

  // ── G. Lamports / SOL utilities ───────────────────────────────────────────
  {
    category: "lamports",
    pattern: /web3\.LAMPORTS_PER_SOL\b/g,
    replacement: "LAMPORTS_PER_SOL",
    description: "web3.LAMPORTS_PER_SOL → LAMPORTS_PER_SOL (direct import)",
  },
  {
    category: "lamports",
    pattern: /import\s*\{([^}]*LAMPORTS_PER_SOL[^}]*)\}\s*from\s*['"]@solana\/web3\.js['"]/g,
    replacement: (m) => {
      const imports = m[1].trim();
      return `import { ${imports} } from '@solana/kit'`;
    },
    description: "LAMPORTS_PER_SOL import → @solana/kit",
  },
];

// ─── Import rewriting ────────────────────────────────────────────────────────

function rewriteImports(code: string, transforms: TransformDetail[]): string {
  // Match: import { A, B, C } from '@solana/web3.js'
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"](@solana\/web3\.js|solana-web3\.js)['"]/g;

  return code.replace(importRegex, (fullMatch, importList, _pkg) => {
    const names = importList.split(",").map((n: string) => n.trim()).filter(Boolean);

    // Group by target package
    const pkgMap: Record<string, string[]> = {};

    for (const name of names) {
      const mapping = IMPORT_MAP[name];
      if (mapping) {
        const targetPkg = mapping.pkg;
        const targetName = mapping.name ?? name;
        if (!pkgMap[targetPkg]) pkgMap[targetPkg] = [];
        pkgMap[targetPkg].push(targetName === name ? name : `${name} as ${targetName}`);
      } else {
        // Unknown — put in @solana/kit catch-all
        if (!pkgMap["@solana/kit"]) pkgMap["@solana/kit"] = [];
        pkgMap["@solana/kit"].push(name);
      }
    }

    const newImports = Object.entries(pkgMap)
      .map(([pkg, importNames]) => `import { ${importNames.join(", ")} } from '${pkg}'`)
      .join("\n");

    transforms.push({
      category: "imports",
      original: fullMatch,
      transformed: newImports,
      flaggedForAI: false,
    });

    return newImports;
  });
}

// ─── Main migrate function ───────────────────────────────────────────────────

export function migrateCode(code: string): MigrateResult {
  const transforms: TransformDetail[] = [];
  let result = code;

  // Step A: rewrite imports first
  result = rewriteImports(result, transforms);

  // Steps B-G: apply regex transforms
  for (const t of TRANSFORMS) {
    const regex = new RegExp(t.pattern.source, t.pattern.flags);
    let match: RegExpExecArray | null;

    // We need to collect matches, then replace
    const matches: Array<{ match: RegExpExecArray; replacement: string }> = [];

    while ((match = regex.exec(result)) !== null) {
      const replacement =
        typeof t.replacement === "string"
          ? t.replacement
          : t.replacement(match);
      matches.push({ match, replacement });
    }

    if (matches.length > 0) {
      // Apply replacements in reverse order (to preserve indices)
      const mutableResult = result.split("");
      for (const { match, replacement } of matches.reverse()) {
        mutableResult.splice(match.index, match[0].length, ...replacement.split(""));
        transforms.push({
          category: t.category,
          original: match[0],
          transformed: replacement,
          flaggedForAI: t.flaggedForAI ?? false,
        });
      }
      result = mutableResult.join("");
    }
  }

  // Compute stats
  const automaticChanges = transforms.filter((t) => !t.flaggedForAI).length;
  const aiRequiredChanges = transforms.filter((t) => t.flaggedForAI).length;
  const totalChanges = transforms.length;
  const coveragePercent =
    totalChanges === 0
      ? 100
      : Math.round((automaticChanges / totalChanges) * 100);

  const byCategory: Record<string, number> = {};
  for (const t of transforms) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
  }

  return {
    transformedCode: result,
    transforms,
    stats: {
      totalChanges,
      automaticChanges,
      aiRequiredChanges,
      coveragePercent,
      byCategory,
    },
  };
}
