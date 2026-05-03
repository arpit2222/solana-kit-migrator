#!/usr/bin/env node
/**
 * solana-kit-migrator CLI
 * Migrates @solana/web3.js v1 → @solana/kit
 *
 * Usage:
 *   node scripts/src/cli.mjs <path> [options]
 *   npx solana-kit-migrator <path> [options]
 *
 * Options:
 *   --write       Write migrated files in-place (default: dry-run)
 *   --ext         Comma-separated extensions (default: .ts,.tsx,.js,.jsx,.mjs)
 *   --summary     Print aggregate stats only (no per-transform details)
 *   --no-color    Disable color output
 *   --help        Show this help
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Colors ───────────────────────────────────────────────────────────────────
const noColor = process.argv.includes("--no-color") || !process.stdout.isTTY;
const c = {
  green: noColor ? "" : "\x1b[32m",
  red: noColor ? "" : "\x1b[31m",
  yellow: noColor ? "" : "\x1b[33m",
  cyan: noColor ? "" : "\x1b[36m",
  blue: noColor ? "" : "\x1b[34m",
  magenta: noColor ? "" : "\x1b[35m",
  bold: noColor ? "" : "\x1b[1m",
  dim: noColor ? "" : "\x1b[2m",
  reset: noColor ? "" : "\x1b[0m",
};

// ── Inline migration engine ───────────────────────────────────────────────────

const IMPORT_MAP = {
  Connection: { pkg: "@solana/rpc", name: "createSolanaRpc" },
  Keypair: { pkg: "@solana/signers", name: "generateKeyPairSigner" },
  PublicKey: { pkg: "@solana/addresses", name: "address" },
  Transaction: { pkg: "@solana/transaction-messages", name: "createTransactionMessage" },
  VersionedTransaction: { pkg: "@solana/transactions", name: null },
  TransactionMessage: { pkg: "@solana/transaction-messages", name: null },
  SystemProgram: { pkg: "@solana/programs", name: "getSystemProgramInstruction" },
  sendAndConfirmTransaction: { pkg: "@solana/transaction-confirmation", name: "sendAndConfirmTransactionFactory" },
  LAMPORTS_PER_SOL: { pkg: "@solana/rpc-types", name: "LAMPORTS_PER_SOL" },
  SYSVAR_RENT_PUBKEY: { pkg: "@solana/sysvars", name: "SYSVAR_RENT_ADDRESS" },
  SYSVAR_CLOCK_PUBKEY: { pkg: "@solana/sysvars", name: "SYSVAR_CLOCK_ADDRESS" },
  SYSVAR_INSTRUCTIONS_PUBKEY: { pkg: "@solana/sysvars", name: "SYSVAR_INSTRUCTIONS_ADDRESS" },
  clusterApiUrl: { pkg: "@solana/rpc", name: null },
  bs58: { pkg: "@solana/codecs", name: "getBase58Encoder" },
  TOKEN_PROGRAM_ID: { pkg: "@solana-program/token", name: "TOKEN_PROGRAM_ADDRESS" },
  ASSOCIATED_TOKEN_PROGRAM_ID: { pkg: "@solana-program/token", name: "ASSOCIATED_TOKEN_PROGRAM_ADDRESS" },
};

const TRANSFORMS = [
  // ── Connection → RPC ──────────────────────────────────────────────────────
  { category: "connection", pattern: /new\s+Connection\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `createSolanaRpc(${m[1].trim()})` },
  { category: "connection", pattern: /(\w+)\.getBalance\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getBalance(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getAccountInfo\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getAccountInfo(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getTokenAccountBalance\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getTokenAccountBalance(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getTransaction\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getTransaction(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getSlot\s*\(\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getSlot().send()` },
  { category: "connection", pattern: /(\w+)\.getLatestBlockhash\s*\(\s*([^)]*)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getLatestBlockhash(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getProgramAccounts\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getProgramAccounts(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getTokenSupply\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getTokenSupply(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getMultipleAccountsInfo\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getMultipleAccounts(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getVersion\s*\(\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getVersion().send()` },
  { category: "connection", pattern: /(\w+)\.getMinimumBalanceForRentExemption\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getMinimumBalanceForRentExemption(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getRecentBlockhash\s*\(\s*([^)]*)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getLatestBlockhash(${m[2].trim()}).send() /* NOTE: getRecentBlockhash deprecated → getLatestBlockhash */` },
  { category: "connection", pattern: /(\w+)\.confirmTransaction\s*\(\s*(\w+)\s*\)/g, flaggedForAI: true, replacement: (m) => `/* TODO: AI_REQUIRED — await ${m[1]}.getSignatureStatuses([${m[2]}]).send() then check confirmations */` },
  { category: "connection", pattern: /(\w+)\.confirmTransaction\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g, flaggedForAI: true, replacement: (m) => `/* TODO: AI_REQUIRED — await ${m[1]}.getSignatureStatuses([${m[2].trim()}]).send() */` },
  { category: "connection", pattern: /(\w+)\.requestAirdrop\s*\(\s*([^,]+),\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.requestAirdrop(${m[2].trim()}, ${m[3].trim()}).send()` },
  { category: "connection", pattern: /clusterApiUrl\s*\(\s*(['"])(\w+)\1\s*\)/g, replacement: (m) => `\`https://api.${m[2]}.solana.com\`` },
  { category: "connection", pattern: /(\w+)\.getSignatureStatuses\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getSignatureStatuses(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.simulateTransaction\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.simulateTransaction(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.sendRawTransaction\s*\(\s*([^)]+)\s*\)/g, flaggedForAI: true, replacement: (m) => `/* TODO: AI_REQUIRED — sendTransactionFactory({ rpc: ${m[1]} })(${m[2].trim()}) — use getBase64EncodedWireTransaction() */` },
  { category: "connection", pattern: /(\w+)\.getBlockTime\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getBlockTime(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getEpochInfo\s*\(\s*([^)]*)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getEpochInfo(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getRecentPerformanceSamples\s*\(\s*([^)]*)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getRecentPerformanceSamples(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getTokenAccountsByOwner\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getTokenAccountsByOwner(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getBlocks\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getBlocks(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getNonce\s*\(\s*([^)]+)\s*\)/g, flaggedForAI: true, replacement: (m) => `/* TODO: AI_REQUIRED — use durable nonce via getAccountInfo + NonceAccount.fromAccountData in @solana/kit */` },
  { category: "connection", pattern: /web3\.Connection\b/g, replacement: "createSolanaRpc" },
  // ── Keypair → KeyPairSigner ────────────────────────────────────────────────
  { category: "keypair", pattern: /web3\.Keypair\b/g, replacement: "/* generateKeyPairSigner */ await generateKeyPairSigner" },
  { category: "keypair", pattern: /Keypair\.generate\s*\(\s*\)/g, replacement: "await generateKeyPairSigner()" },
  { category: "keypair", pattern: /Keypair\.fromSecretKey\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `await createKeyPairSignerFromBytes(${m[1].trim()})` },
  { category: "keypair", pattern: /Keypair\.fromSeed\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `await createKeyPairSignerFromBytes(${m[1].trim()})` },
  { category: "keypair", pattern: /(\w+)\.publicKey\b/g, replacement: (m) => `${m[1]}.address` },
  { category: "keypair", pattern: /(\w+)\.secretKey\b/g, flaggedForAI: true, replacement: (m) => `${m[1]}.secretKey /* TODO: AI_REQUIRED — secretKey not exposed in @solana/kit KeyPairSigner */` },
  // ── PublicKey → address() ──────────────────────────────────────────────────
  { category: "publickey", pattern: /web3\.PublicKey\b/g, replacement: "address" },
  { category: "publickey", pattern: /new\s+PublicKey\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `address(${m[1].trim()})` },
  { category: "publickey", pattern: /PublicKey\.findProgramAddressSync\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g, replacement: (m) => `await getProgramDerivedAddress({ programAddress: ${m[2].trim()}, seeds: ${m[1].trim()} })` },
  { category: "publickey", pattern: /PublicKey\.findProgramAddress\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g, replacement: (m) => `await getProgramDerivedAddress({ programAddress: ${m[2].trim()}, seeds: ${m[1].trim()} })` },
  { category: "publickey", pattern: /PublicKey\.createWithSeed\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/g, flaggedForAI: true, replacement: (m) => `/* TODO: AI_REQUIRED — getAddressWithSeed({ baseAddress: ${m[1].trim()}, programAddress: ${m[3].trim()}, seed: ${m[2].trim()} }) */` },
  { category: "publickey", pattern: /PublicKey\.isOnCurve\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `isAddress(${m[1].trim()})` },
  { category: "publickey", pattern: /SystemProgram\.programId\b/g, replacement: "SYSTEM_PROGRAM_ADDRESS" },
  { category: "publickey", pattern: /TOKEN_PROGRAM_ID\b/g, replacement: "TOKEN_PROGRAM_ADDRESS" },
  { category: "publickey", pattern: /ASSOCIATED_TOKEN_PROGRAM_ID\b/g, replacement: "ASSOCIATED_TOKEN_PROGRAM_ADDRESS" },
  { category: "publickey", pattern: /SYSVAR_RENT_PUBKEY\b/g, replacement: "SYSVAR_RENT_ADDRESS" },
  { category: "publickey", pattern: /SYSVAR_CLOCK_PUBKEY\b/g, replacement: "SYSVAR_CLOCK_ADDRESS" },
  { category: "publickey", pattern: /SYSVAR_INSTRUCTIONS_PUBKEY\b/g, replacement: "SYSVAR_INSTRUCTIONS_ADDRESS" },
  { category: "publickey", pattern: /(\w+)\.toBase58\s*\(\s*\)/g, replacement: (m) => m[1] },
  { category: "publickey", pattern: /(\w+)\.equals\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `(${m[1]} === ${m[2].trim()})` },
  // ── Transactions ───────────────────────────────────────────────────────────
  { category: "transaction", pattern: /new\s+Transaction\s*\(\s*\)(?!\s*\.add)/g, replacement: "createTransactionMessage({ version: 0 })" },
  { category: "transaction", pattern: /(\w+)\s*=\s*new\s+Transaction\s*\(\s*\)/g, replacement: (m) => `${m[1]} = createTransactionMessage({ version: 0 })` },
  { category: "transaction", pattern: /(\w+)\.add\s*\(\s*(\w+)\s*\)/g, replacement: (m) => `appendTransactionMessageInstruction(${m[2]}, ${m[1]})` },
  { category: "transaction", pattern: /(\w+)\.feePayer\s*=\s*(\w+\.address|\w+)/g, replacement: (m) => `${m[1]} = setTransactionMessageFeePayerSigner(${m[2]}, ${m[1]})` },
  { category: "transaction", pattern: /(\w+)\.recentBlockhash\s*=\s*(\w+(?:\.\w+)*)/g, replacement: (m) => `${m[1]} = setTransactionMessageLifetimeUsingBlockhash({ blockhash: ${m[2]}, lastValidBlockHeight: BigInt(0) }, ${m[1]})` },
  { category: "transaction", pattern: /sendAndConfirmTransaction\s*\(\s*(\w+),\s*(\w+),\s*\[([^\]]+)\]\s*\)/g, replacement: (m) => `await sendAndConfirmTransactionFactory({ rpc: ${m[1]} })(${m[2]}, { commitment: 'confirmed' })` },
  { category: "transaction", pattern: /new\s+Transaction\s*\(\s*\)\s*\.add\s*\(/g, flaggedForAI: true, replacement: "/* TODO: AI_REQUIRED — pipe(createTransactionMessage({version:0}), appendTransactionMessageInstructions([" },
  { category: "transaction", pattern: /new\s+VersionedTransaction\s*\(\s*([^)]+)\s*\)/g, flaggedForAI: true, replacement: (m) => `/* TODO: AI_REQUIRED — compileTransaction(${m[1].trim()}) */` },
  { category: "transaction", pattern: /TransactionMessage\.decompile\s*\(\s*([^)]+)\s*\)/g, flaggedForAI: true, replacement: (m) => `/* TODO: AI_REQUIRED — decompileTransaction(${m[1].trim()}) */` },
  // ── Buffer / encoding ──────────────────────────────────────────────────────
  { category: "buffer", pattern: /bs58\.encode\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `getBase58Encoder().encode(${m[1].trim()})` },
  { category: "buffer", pattern: /bs58\.decode\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `getBase58Decoder().decode(${m[1].trim()})` },
  { category: "buffer", pattern: /Buffer\.from\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `new Uint8Array(${m[1].trim()})` },
  { category: "buffer", pattern: /Buffer\.alloc\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `new Uint8Array(${m[1].trim()})` },
  { category: "buffer", pattern: /Buffer\.concat\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `new Uint8Array([...${m[1].trim()}.flat()])` },
  { category: "buffer", pattern: /(\w+)\.toBuffer\s*\(\s*\)/g, replacement: (m) => `new Uint8Array(${m[1]})` },
  // ── Lamports ───────────────────────────────────────────────────────────────
  { category: "lamports", pattern: /(\d+(?:\.\d+)?)\s*\*\s*LAMPORTS_PER_SOL\b/g, replacement: (m) => `lamports(BigInt(${m[1]} * 1_000_000_000))` },
];

function rewriteImports(code, transforms) {
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"](@solana\/web3\.js|solana-web3\.js)['"]/g;
  return code.replace(importRegex, (fullMatch, importList) => {
    const names = importList.split(",").map((n) => n.trim()).filter(Boolean);
    const pkgMap = {};
    for (const name of names) {
      const mapping = IMPORT_MAP[name];
      const targetPkg = mapping?.pkg ?? "@solana/kit";
      const targetName = mapping?.name;
      if (!pkgMap[targetPkg]) pkgMap[targetPkg] = [];
      pkgMap[targetPkg].push(targetName ?? name);
    }
    const newImports = Object.entries(pkgMap)
      .map(([pkg, ns]) => `import { ${ns.join(", ")} } from '${pkg}'`)
      .join("\n");
    transforms.push({ category: "imports", original: fullMatch, transformed: newImports, flaggedForAI: false });
    return newImports;
  });
}

function migrateCode(code) {
  const transforms = [];
  let result = rewriteImports(code, transforms);
  for (const t of TRANSFORMS) {
    const regex = new RegExp(t.pattern.source, t.pattern.flags);
    const matches = [];
    let m;
    while ((m = regex.exec(result)) !== null) {
      const rep = typeof t.replacement === "string" ? t.replacement : t.replacement(m);
      matches.push({ match: m, replacement: rep });
    }
    if (matches.length > 0) {
      const chars = result.split("");
      for (const { match, replacement } of matches.reverse()) {
        chars.splice(match.index, match[0].length, ...replacement.split(""));
        transforms.push({ category: t.category, original: match[0], transformed: replacement, flaggedForAI: t.flaggedForAI ?? false });
      }
      result = chars.join("");
    }
  }
  const automaticChanges = transforms.filter((t) => !t.flaggedForAI).length;
  const aiRequiredChanges = transforms.filter((t) => t.flaggedForAI).length;
  const totalChanges = transforms.length;
  const coveragePercent = totalChanges === 0 ? 100 : Math.round((automaticChanges / totalChanges) * 100);
  const byCategory = {};
  for (const t of transforms) byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
  return { transformedCode: result, transforms, stats: { totalChanges, automaticChanges, aiRequiredChanges, coveragePercent, byCategory } };
}

function hasWeb3Import(code) {
  return /@solana\/web3\.js/.test(code);
}

function walkFiles(dir, exts, result = []) {
  if (!fs.existsSync(dir)) return result;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return result; }
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "dist" || e.name === ".git") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(full, exts, result);
    else if (exts.some((x) => e.name.endsWith(x))) result.push(full);
  }
  return result;
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
${c.bold}solana-kit-migrator${c.reset} — Migrate @solana/web3.js v1 → @solana/kit

${c.bold}USAGE${c.reset}
  node scripts/src/cli.mjs <path> [options]
  npx solana-kit-migrator <path> [options]

${c.bold}ARGUMENTS${c.reset}
  <path>        File or directory to migrate

${c.bold}OPTIONS${c.reset}
  --write       Write migrated files in-place (default: dry-run)
  --ext         Comma-separated extensions (default: ts,tsx,js,jsx,mjs)
  --summary     Print aggregate stats only
  --no-color    Disable color output
  --help        Show this help

${c.bold}EXAMPLES${c.reset}
  # Dry-run preview on a directory
  node scripts/src/cli.mjs ./src

  # Write migrations in-place
  node scripts/src/cli.mjs ./src --write

  # Migrate a single file
  node scripts/src/cli.mjs ./src/connection.ts --write

  # Only TypeScript files
  node scripts/src/cli.mjs ./src --ext ts,tsx --write
`);
}

function bar(n, total, width = 20) {
  const filled = Math.round((n / Math.max(total, 1)) * width);
  return c.green + "█".repeat(filled) + c.dim + "░".repeat(width - filled) + c.reset;
}

function fmtPercent(n) {
  if (n === 100) return `${c.green}${c.bold}${n}%${c.reset}`;
  if (n >= 80) return `${c.yellow}${n}%${c.reset}`;
  return `${c.red}${n}%${c.reset}`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const targetArg = args.find((a) => !a.startsWith("--"));
  if (!targetArg) {
    console.error(`${c.red}Error: no path provided. Run --help for usage.${c.reset}`);
    process.exit(1);
  }

  const targetPath = path.resolve(targetArg);
  if (!fs.existsSync(targetPath)) {
    console.error(`${c.red}Error: path not found: ${targetPath}${c.reset}`);
    process.exit(1);
  }

  const doWrite = args.includes("--write");
  const summaryOnly = args.includes("--summary");
  const extFlagIdx = args.indexOf("--ext");
  const extFlagEq = args.find((a) => a.startsWith("--ext="));
  const extArg = extFlagEq
    ? extFlagEq.split("=")[1]
    : extFlagIdx !== -1
      ? args[extFlagIdx + 1]
      : "ts,tsx,js,jsx,mjs";
  const exts = extArg.split(",").map((e) => (e.startsWith(".") ? e : `.${e}`));

  // Find files
  const stat = fs.statSync(targetPath);
  const allFiles = stat.isFile()
    ? [targetPath]
    : walkFiles(targetPath, exts);

  const web3Files = allFiles.filter((f) => {
    try { return hasWeb3Import(fs.readFileSync(f, "utf8")); } catch { return false; }
  });

  console.log(`
${c.bold}${c.cyan}solana-kit-migrator${c.reset}
${c.dim}@solana/web3.js v1 → @solana/kit${c.reset}

${c.bold}Target:${c.reset}  ${targetPath}
${c.bold}Mode:${c.reset}    ${doWrite ? `${c.yellow}WRITE (files will be modified)${c.reset}` : `${c.cyan}DRY-RUN (no files changed)${c.reset}`}
${c.bold}Scanned:${c.reset} ${allFiles.length} files | ${c.bold}${web3Files.length}${c.reset} contain @solana/web3.js
`);

  if (web3Files.length === 0) {
    console.log(`${c.green}✓ No @solana/web3.js imports found — nothing to migrate.${c.reset}\n`);
    process.exit(0);
  }

  // Process files
  let totalChanges = 0;
  let totalAutomatic = 0;
  let totalAI = 0;
  const byCategory = {};
  const fileResults = [];

  for (const filePath of web3Files) {
    const code = fs.readFileSync(filePath, "utf8");
    const { transformedCode, stats } = migrateCode(code);
    const rel = path.relative(process.cwd(), filePath);

    totalChanges += stats.totalChanges;
    totalAutomatic += stats.automaticChanges;
    totalAI += stats.aiRequiredChanges;
    for (const [cat, count] of Object.entries(stats.byCategory)) {
      byCategory[cat] = (byCategory[cat] ?? 0) + count;
    }

    fileResults.push({ filePath, rel, stats, transformedCode, original: code });

    if (!summaryOnly) {
      const icon = stats.aiRequiredChanges > 0 ? `${c.yellow}⚠${c.reset}` : `${c.green}✓${c.reset}`;
      const changed = stats.totalChanges > 0;
      console.log(`${icon} ${c.bold}${rel}${c.reset}`);
      if (changed) {
        console.log(`   ${bar(stats.automaticChanges, stats.totalChanges)} ${fmtPercent(stats.coveragePercent)} automated  ${c.dim}(${stats.automaticChanges} auto, ${stats.aiRequiredChanges} needs AI)${c.reset}`);
        const cats = Object.entries(stats.byCategory).map(([k, v]) => `${k}:${v}`).join("  ");
        if (cats) console.log(`   ${c.dim}${cats}${c.reset}`);
      } else {
        console.log(`   ${c.dim}(no changes needed)${c.reset}`);
      }
    }

    if (doWrite && transformedCode !== code) {
      fs.writeFileSync(filePath, transformedCode, "utf8");
    }
  }

  // Summary
  const overallPct = totalChanges === 0 ? 100 : Math.round((totalAutomatic / totalChanges) * 100);

  console.log(`
${c.bold}${"─".repeat(60)}${c.reset}
${c.bold}MIGRATION SUMMARY${c.reset}

  Files processed:   ${web3Files.length}
  Total transforms:  ${totalChanges}
  Automated:         ${c.green}${totalAutomatic}${c.reset} (${fmtPercent(overallPct)})
  Needs AI:          ${totalAI > 0 ? c.yellow : c.green}${totalAI}${c.reset}

  ${bar(totalAutomatic, totalChanges, 30)} ${fmtPercent(overallPct)} automated

`);

  if (Object.keys(byCategory).length > 0) {
    console.log(`${c.bold}By category:${c.reset}`);
    for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${c.dim}${cat.padEnd(20)}${c.reset} ${count}`);
    }
    console.log();
  }

  if (totalAI > 0) {
    console.log(`${c.yellow}${c.bold}⚠  ${totalAI} transform(s) require AI assistance.${c.reset}`);
    console.log(`${c.dim}   Search for TODO: AI_REQUIRED in your migrated files.${c.reset}\n`);
  }

  if (!doWrite) {
    console.log(`${c.cyan}Dry-run complete. Run with ${c.bold}--write${c.reset}${c.cyan} to apply changes.${c.reset}\n`);
  } else {
    const written = fileResults.filter((r) => r.transformedCode !== r.original).length;
    console.log(`${c.green}${c.bold}✓ ${written} file(s) written.${c.reset}\n`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(`${c.red}Fatal error:${c.reset}`, e.message);
  process.exit(1);
});
