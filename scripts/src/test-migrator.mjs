/**
 * Test the Solana migration engine against real repos.
 * Usage: node scripts/src/test-migrator.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Inline the migration engine (copied from lib/migrator.ts, plain JS) ──────

const IMPORT_MAP = {
  Connection: { pkg: "@solana/rpc" },
  Keypair: { pkg: "@solana/signers" },
  PublicKey: { pkg: "@solana/addresses", name: "Address" },
  Transaction: { pkg: "@solana/transactions" },
  TransactionInstruction: { pkg: "@solana/transactions" },
  SystemProgram: { pkg: "@solana/programs" },
  TOKEN_PROGRAM_ID: { pkg: "@solana/spl-token", name: "TOKEN_PROGRAM_ADDRESS" },
  ASSOCIATED_TOKEN_PROGRAM_ID: { pkg: "@solana/spl-token", name: "ASSOCIATED_TOKEN_PROGRAM_ADDRESS" },
  LAMPORTS_PER_SOL: { pkg: "@solana/kit" },
  sendAndConfirmTransaction: { pkg: "@solana/transactions" },
  clusterApiUrl: { pkg: "@solana/rpc" },
  bs58: { pkg: "@solana/codecs", name: "getBase58Encoder" },
};

const TRANSFORMS = [
  { category: "connection", pattern: /new\s+Connection\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `createSolanaRpc(${m[1].trim()})` },
  { category: "connection", pattern: /(\w+)\.getBalance\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `await ${m[1]}.getBalance(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getAccountInfo\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `await ${m[1]}.getAccountInfo(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getTokenAccountBalance\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `await ${m[1]}.getTokenAccountBalance(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getTransaction\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `await ${m[1]}.getTransaction(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getSlot\s*\(\s*\)/g, replacement: (m) => `await ${m[1]}.getSlot().send()` },
  { category: "connection", pattern: /clusterApiUrl\s*\(\s*(['"])(\w+)\1\s*\)/g, replacement: (m) => `\`https://api.${m[2]}.solana.com\`` },
  { category: "keypair", pattern: /Keypair\.generate\s*\(\s*\)/g, replacement: "await generateKeyPairSigner()" },
  { category: "keypair", pattern: /Keypair\.fromSecretKey\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `await createKeyPairSignerFromBytes(${m[1].trim()})` },
  { category: "keypair", pattern: /Keypair\.fromSeed\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `await createKeyPairSignerFromBytes(${m[1].trim()})` },
  { category: "keypair", pattern: /(\w+)\.publicKey\b/g, replacement: (m) => `${m[1]}.address` },
  { category: "keypair", flaggedForAI: true, pattern: /(\w+)\.secretKey\b/g, replacement: (m) => `${m[1]}.secretKey /* TODO: AI_REQUIRED */` },
  { category: "publickey", pattern: /new\s+PublicKey\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `address(${m[1].trim()})` },
  { category: "publickey", pattern: /PublicKey\.findProgramAddressSync\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g, replacement: (m) => `await getProgramDerivedAddress({ programAddress: ${m[2].trim()}, seeds: ${m[1].trim()} })` },
  { category: "publickey", pattern: /PublicKey\.findProgramAddress\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g, replacement: (m) => `await getProgramDerivedAddress({ programAddress: ${m[2].trim()}, seeds: ${m[1].trim()} })` },
  { category: "publickey", flaggedForAI: true, pattern: /PublicKey\.createWithSeed\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/g, replacement: (m) => `/* TODO: AI_REQUIRED — getAddressWithSeed */` },
  { category: "publickey", pattern: /SystemProgram\.programId\b/g, replacement: "SYSTEM_PROGRAM_ADDRESS" },
  { category: "publickey", pattern: /TOKEN_PROGRAM_ID\b/g, replacement: "TOKEN_PROGRAM_ADDRESS" },
  { category: "publickey", pattern: /ASSOCIATED_TOKEN_PROGRAM_ID\b/g, replacement: "ASSOCIATED_TOKEN_PROGRAM_ADDRESS" },
  { category: "publickey", pattern: /(\w+)\.toBase58\s*\(\s*\)/g, replacement: (m) => m[1] },
  { category: "transaction", flaggedForAI: true, pattern: /new\s+Transaction\s*\(\s*\)\s*\.add\s*\(/g, replacement: `/* TODO: AI_REQUIRED — pipe(createTransaction, appendTransactionMessageInstructions */` },
  { category: "transaction", flaggedForAI: true, pattern: /sendAndConfirmTransaction\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/g, replacement: (m) => `/* TODO: AI_REQUIRED — sendAndConfirmTransactionFactory */` },
  { category: "buffer", pattern: /bs58\.encode\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `getBase58Encoder().encode(${m[1].trim()})` },
  { category: "buffer", pattern: /bs58\.decode\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `getBase58Decoder().decode(${m[1].trim()})` },
  { category: "buffer", pattern: /Buffer\.from\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `new Uint8Array(${m[1].trim()})` },
  { category: "buffer", pattern: /Buffer\.alloc\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `new Uint8Array(${m[1].trim()})` },
  { category: "lamports", pattern: /web3\.LAMPORTS_PER_SOL\b/g, replacement: "LAMPORTS_PER_SOL" },
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
      pkgMap[targetPkg].push(targetName ? `${name} as ${targetName}` : name);
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

// ── File discovery ─────────────────────────────────────────────────────────

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

function hasWeb3Import(code) {
  return /@solana\/web3\.js/.test(code);
}

// ── Test runner ────────────────────────────────────────────────────────────

function testRepo(repoName, repoDir) {
  const files = walkFiles(repoDir, [".ts", ".tsx", ".js", ".jsx", ".mjs"]);
  const web3Files = files.filter((f) => {
    try { return hasWeb3Import(fs.readFileSync(f, "utf8")); } catch { return false; }
  });

  if (web3Files.length === 0) {
    return { repoName, filesScanned: files.length, filesWithWeb3: 0, totalChanges: 0, automaticChanges: 0, aiRequiredChanges: 0, coveragePercent: 100, byCategory: {}, sampleTransforms: [] };
  }

  let totalChanges = 0, automaticChanges = 0, aiRequiredChanges = 0;
  const byCategory = {};
  const sampleTransforms = [];

  for (const f of web3Files) {
    let code;
    try { code = fs.readFileSync(f, "utf8"); } catch { continue; }
    const result = migrateCode(code);
    totalChanges += result.stats.totalChanges;
    automaticChanges += result.stats.automaticChanges;
    aiRequiredChanges += result.stats.aiRequiredChanges;
    for (const [cat, count] of Object.entries(result.stats.byCategory)) {
      byCategory[cat] = (byCategory[cat] ?? 0) + count;
    }
    // Collect a couple of sample transforms per repo
    if (sampleTransforms.length < 4) {
      for (const t of result.transforms.slice(0, 2)) {
        sampleTransforms.push({ file: path.relative(repoDir, f), ...t });
      }
    }
  }

  const coveragePercent = totalChanges === 0 ? 100 : Math.round((automaticChanges / totalChanges) * 100);

  return {
    repoName,
    filesScanned: files.length,
    filesWithWeb3: web3Files.length,
    totalChanges,
    automaticChanges,
    aiRequiredChanges,
    coveragePercent,
    byCategory,
    sampleTransforms,
  };
}

// ── Main ───────────────────────────────────────────────────────────────────

const REPOS = [
  { name: "solana-labs/example-helloworld",       dir: "/tmp/solana-test-repos/example-helloworld" },
  { name: "metaplex-foundation/mpl-token-metadata", dir: "/tmp/solana-test-repos/mpl-token-metadata" },
  { name: "solana-labs/solana-web3.js",            dir: "/tmp/solana-test-repos/solana-web3.js" },
  { name: "solana-developers/solana-cookbook",     dir: "/tmp/solana-test-repos/solana-cookbook" },
  { name: "solana-developers/program-examples",   dir: "/tmp/solana-test-repos/program-examples" },
  { name: "solana-labs/token-list",               dir: "/tmp/solana-test-repos/token-list" },
];

console.log("=".repeat(70));
console.log("  solana-kit-migrator — Real Repo Test Results");
console.log("=".repeat(70));
console.log();

const results = [];
for (const repo of REPOS) {
  if (!fs.existsSync(repo.dir)) {
    console.log(`SKIP  ${repo.name} (not cloned)`);
    continue;
  }
  const r = testRepo(repo.name, repo.dir);
  results.push(r);

  console.log(`REPO  ${r.repoName}`);
  console.log(`      Files scanned:   ${r.filesScanned}`);
  console.log(`      Files with web3: ${r.filesWithWeb3}`);
  if (r.totalChanges > 0) {
    console.log(`      Total changes:   ${r.totalChanges}`);
    console.log(`      Automated:       ${r.automaticChanges} (${r.coveragePercent}%)`);
    console.log(`      AI required:     ${r.aiRequiredChanges}`);
    console.log(`      By category:     ${JSON.stringify(r.byCategory)}`);
    if (r.sampleTransforms.length > 0) {
      console.log(`      Sample transforms:`);
      for (const t of r.sampleTransforms.slice(0, 3)) {
        console.log(`        [${t.category}] ${t.flaggedForAI ? "AI⚠ " : "AUTO"} "${t.original.slice(0, 60).replace(/\n/g, "\\n")}"`);
      }
    }
  } else {
    console.log(`      (no @solana/web3.js usage found)`);
  }
  console.log();
}

// Aggregate
const totals = results.reduce((acc, r) => ({
  filesScanned: acc.filesScanned + r.filesScanned,
  filesWithWeb3: acc.filesWithWeb3 + r.filesWithWeb3,
  totalChanges: acc.totalChanges + r.totalChanges,
  automaticChanges: acc.automaticChanges + r.automaticChanges,
  aiRequiredChanges: acc.aiRequiredChanges + r.aiRequiredChanges,
}), { filesScanned: 0, filesWithWeb3: 0, totalChanges: 0, automaticChanges: 0, aiRequiredChanges: 0 });

const overallCoverage = totals.totalChanges === 0 ? 100 : Math.round((totals.automaticChanges / totals.totalChanges) * 100);

console.log("=".repeat(70));
console.log("  AGGREGATE");
console.log("=".repeat(70));
console.log(`  Repos tested:        ${results.length}`);
console.log(`  Total files scanned: ${totals.filesScanned}`);
console.log(`  Files with web3.js:  ${totals.filesWithWeb3}`);
console.log(`  Total changes:       ${totals.totalChanges}`);
console.log(`  Automated:           ${totals.automaticChanges} (${overallCoverage}%)`);
console.log(`  AI required:         ${totals.aiRequiredChanges}`);
console.log("=".repeat(70));
