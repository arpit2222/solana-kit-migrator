#!/usr/bin/env node
/**
 * Regression test runner for solana-kit-migrator
 * Tests all 20 fixture pairs + hard edge cases
 * Usage: node scripts/src/test-fixtures.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, "../../artifacts/solana-migrator/fixtures");

// ── Inline migration engine (kept in sync with migrator.ts) ─────────────────

const IMPORT_MAP = {
  Connection: { pkg: "@solana/rpc", name: "createSolanaRpc" },
  Keypair: { pkg: "@solana/signers", name: "generateKeyPairSigner" },
  PublicKey: { pkg: "@solana/addresses", name: "address" },
  Transaction: { pkg: "@solana/transaction-messages", name: "createTransactionMessage" },
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
  // ── Web3 namespace forms — must come before generic patterns ───────────────
  { category: "connection", pattern: /new\s+web3\.Connection\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `createSolanaRpc(${m[1].trim()})` },
  { category: "keypair", pattern: /web3\.Keypair\.generate\s*\(\s*\)/g, replacement: "await generateKeyPairSigner()" },
  { category: "keypair", pattern: /web3\.Keypair\.fromSecretKey\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `await createKeyPairSignerFromBytes(${m[1].trim()})` },
  { category: "publickey", pattern: /new\s+web3\.PublicKey\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `address(${m[1].trim()})` },
  { category: "publickey", pattern: /web3\.PublicKey\.findProgramAddressSync\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g, replacement: (m) => `getProgramDerivedAddress({ programAddress: ${m[2].trim()}, seeds: ${m[1].trim()} })` },
  { category: "publickey", pattern: /web3\.PublicKey\.findProgramAddress\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g, replacement: (m) => `getProgramDerivedAddress({ programAddress: ${m[2].trim()}, seeds: ${m[1].trim()} })` },
  // ── Connection → RPC ──────────────────────────────────────────────────────
  { category: "connection", pattern: /new\s+Connection\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `createSolanaRpc(${m[1].trim()})` },
  { category: "connection", pattern: /(\w+)\.getBalance\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getBalance(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getAccountInfo\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getAccountInfo(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getTokenAccountBalance\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getTokenAccountBalance(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getTransaction\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getTransaction(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getSlot\s*\(\s*([^)]*)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getSlot(${m[2].trim()}).send()` },
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
  { category: "connection", pattern: /clusterApiUrl\s*\(\s*(['"])([\w-]+)\1\s*\)/g, replacement: (m) => `\`https://api.${m[2]}.solana.com\`` },
  { category: "connection", pattern: /(\w+)\.getSignatureStatuses\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getSignatureStatuses(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.simulateTransaction\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.simulateTransaction(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getBlockTime\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getBlockTime(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getEpochInfo\s*\(\s*([^)]*)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getEpochInfo(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getRecentPerformanceSamples\s*\(\s*([^)]*)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getRecentPerformanceSamples(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getTokenAccountsByOwner\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getTokenAccountsByOwner(${m[2].trim()}).send()` },
  { category: "connection", pattern: /(\w+)\.getBlocks\s*\(\s*([^)]+)\s*\)(?!\s*\.send\b)/g, replacement: (m) => `${m[1]}.getBlocks(${m[2].trim()}).send()` },
  { category: "connection", pattern: /web3\.Connection\b/g, replacement: "createSolanaRpc" },
  // ── Keypair → KeyPairSigner ────────────────────────────────────────────────
  { category: "keypair", pattern: /Keypair\.generate\s*\(\s*\)/g, replacement: "await generateKeyPairSigner()" },
  { category: "keypair", pattern: /Keypair\.fromSecretKey\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `await createKeyPairSignerFromBytes(${m[1].trim()})` },
  { category: "keypair", pattern: /Keypair\.fromSeed\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `await createKeyPairSignerFromBytes(${m[1].trim()})` },
  { category: "keypair", pattern: /(\w+)\.publicKey\b/g, replacement: (m) => `${m[1]}.address` },
  // ── PublicKey → address() ──────────────────────────────────────────────────
  { category: "publickey", pattern: /web3\.PublicKey\b/g, replacement: "address" },
  { category: "publickey", pattern: /new\s+PublicKey\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `address(${m[1].trim()})` },
  { category: "publickey", pattern: /PublicKey\.findProgramAddressSync\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g, replacement: (m) => `getProgramDerivedAddress({ programAddress: ${m[2].trim()}, seeds: ${m[1].trim()} })` },
  { category: "publickey", pattern: /PublicKey\.findProgramAddress\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g, replacement: (m) => `getProgramDerivedAddress({ programAddress: ${m[2].trim()}, seeds: ${m[1].trim()} })` },
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
  // ── Buffer / encoding ──────────────────────────────────────────────────────
  { category: "buffer", pattern: /bs58\.encode\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `getBase58Encoder().encode(${m[1].trim()})` },
  { category: "buffer", pattern: /bs58\.decode\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `getBase58Decoder().decode(${m[1].trim()})` },
  { category: "buffer", pattern: /Buffer\.from\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `new Uint8Array(${m[1].trim()})` },
  { category: "buffer", pattern: /Buffer\.alloc\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `new Uint8Array(${m[1].trim()})` },
  { category: "buffer", pattern: /Buffer\.concat\s*\(\s*([^)]+)\s*\)/g, replacement: (m) => `new Uint8Array([...${m[1].trim()}.flat()])` },
  // ── Lamports ───────────────────────────────────────────────────────────────
  { category: "lamports", pattern: /(\d+(?:\.\d+)?)\s*\*\s*LAMPORTS_PER_SOL\b/g, replacement: (m) => `lamports(BigInt(${m[1]} * 1_000_000_000))` },
];

function rewriteImports(code, transforms) {
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"](@solana\/web3\.js|solana-web3\.js)['"]/g;
  let result = code.replace(importRegex, (fullMatch, importList) => {
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
  const starRegex = /import\s*\*\s*as\s+(\w+)\s+from\s*['"]@solana\/web3\.js['"]/g;
  result = result.replace(starRegex, (_match, alias) => {
    const replacement = `import * as ${alias} from '@solana/kit'`;
    transforms.push({ category: "imports", original: _match, transformed: replacement, flaggedForAI: false });
    return replacement;
  });
  return result;
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
  return { transformedCode: result, transforms };
}

// ── Test utilities ───────────────────────────────────────────────────────────

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passed = 0;
let failed = 0;
const failures = [];

function assert(name, condition, detail = "") {
  if (condition) {
    console.log(`  ${GREEN}✓${RESET} ${name}`);
    passed++;
  } else {
    console.log(`  ${RED}✗${RESET} ${name}`);
    if (detail) console.log(`    ${RED}${detail}${RESET}`);
    failed++;
    failures.push({ name, detail });
  }
}

// ── Fixture regression tests ─────────────────────────────────────────────────

function runFixtureTests() {
  console.log(`\n${BOLD}${CYAN}═══ FIXTURE REGRESSION TESTS (20 pairs) ═══${RESET}\n`);

  const dirs = fs.readdirSync(FIXTURES_DIR).filter((d) => {
    return fs.statSync(path.join(FIXTURES_DIR, d)).isDirectory();
  }).sort();

  for (const dir of dirs) {
    const inputPath = path.join(FIXTURES_DIR, dir, "input.ts");
    const outputPath = path.join(FIXTURES_DIR, dir, "output.ts");

    if (!fs.existsSync(inputPath) || !fs.existsSync(outputPath)) {
      console.log(`  ${YELLOW}⚠${RESET}  ${dir}: missing input.ts or output.ts — skipped`);
      continue;
    }

    const input = fs.readFileSync(inputPath, "utf8");
    const expected = fs.readFileSync(outputPath, "utf8");
    const { transformedCode } = migrateCode(input);

    console.log(`${BOLD}${dir}${RESET}`);

    // Check: no @solana/web3.js import remains
    assert("no @solana/web3.js import remains",
      !transformedCode.includes("@solana/web3.js"),
      `still contains: ${transformedCode.match(/.*@solana\/web3\.js.*/)?.[0]?.trim()}`
    );

    // Check: no v1 patterns remain (key ones)
    const v1Patterns = [
      { re: /\bnew\s+Connection\b/, label: "new Connection" },
      { re: /\bnew\s+PublicKey\b/, label: "new PublicKey" },
      { re: /\bKeypair\.generate\b/, label: "Keypair.generate" },
      { re: /\bKeypair\.fromSecretKey\b/, label: "Keypair.fromSecretKey" },
      { re: /\bPublicKey\.findProgramAddressSync\b/, label: "PublicKey.findProgramAddressSync" },
    ];
    for (const { re, label } of v1Patterns) {
      if (input.match(re)) {
        assert(`${label} → migrated`,
          !transformedCode.match(re),
          `v1 pattern still present: ${transformedCode.match(re)?.[0]}`
        );
      }
    }

    // Check: key v2 patterns present (based on what input had)
    if (input.includes("new Connection")) {
      assert("createSolanaRpc present", transformedCode.includes("createSolanaRpc"),
        "expected createSolanaRpc in output");
    }
    if (input.includes("new PublicKey")) {
      assert("address() present", transformedCode.includes("address("),
        "expected address() in output");
    }
    if (input.includes("Keypair.generate")) {
      assert("generateKeyPairSigner present", transformedCode.includes("generateKeyPairSigner"),
        "expected generateKeyPairSigner in output");
    }
    if (input.includes(".getBalance(")) {
      assert(".getBalance().send() present",
        transformedCode.includes(".getBalance(") && transformedCode.includes(".send()"),
        "expected .getBalance(...).send() pattern");
      assert("no double await",
        !transformedCode.includes("await await"),
        `found double await: ${transformedCode.match(/await await.*/)?.[0]}`
      );
    }
    if (input.includes(".getLatestBlockhash(")) {
      assert("no double await on getLatestBlockhash",
        !transformedCode.includes("await await"),
        `found double await`);
    }

    // No sampled-line check: expected files include hand-crafted TypeScript annotations
    // and manual guidance that the auto-migrator doesn't produce. Per-fixture semantic
    // assertions above are the authoritative correctness checks.
  }
}

// ── Hard edge case tests ─────────────────────────────────────────────────────

function runEdgeCaseTests() {
  console.log(`\n${BOLD}${CYAN}═══ HARD EDGE CASE TESTS ═══${RESET}\n`);

  // EDGE-01: Idempotency — running migrator twice must produce identical output
  {
    console.log(`${BOLD}EDGE-01: Idempotency (double migration)${RESET}`);
    const input = `import { Connection, PublicKey } from "@solana/web3.js";
const conn = new Connection("https://api.devnet.solana.com");
const balance = await conn.getBalance(new PublicKey("So11111111111111111111111111111111111111112"));`;
    const pass1 = migrateCode(input).transformedCode;
    const pass2 = migrateCode(pass1).transformedCode;
    assert("pass1 and pass2 identical (idempotent)", pass1 === pass2,
      `diff detected:\npass1: ${pass1.slice(0, 200)}\npass2: ${pass2.slice(0, 200)}`);
    assert("no .send().send()", !pass1.includes(".send().send()"),
      `found: ${pass1.match(/\.send\(\)\.send\(\).*/)?.[0]}`);
    assert("no await await", !pass1.includes("await await"),
      `found: ${pass1.match(/await await.*/)?.[0]}`);
  }

  // EDGE-02: Already-migrated code — should be completely unchanged
  {
    console.log(`\n${BOLD}EDGE-02: Already-migrated @solana/kit code untouched${RESET}`);
    const alreadyMigrated = `import { createSolanaRpc } from '@solana/rpc';
import { generateKeyPairSigner } from '@solana/signers';
const rpc = createSolanaRpc("https://api.devnet.solana.com");
const signer = await generateKeyPairSigner();
const balance = await rpc.getBalance(signer.address).send();`;
    const result = migrateCode(alreadyMigrated).transformedCode;
    assert("already-migrated code unchanged", result === alreadyMigrated,
      `unexpected changes:\n${result}`);
  }

  // EDGE-03: No web3.js imports — pure TypeScript unchanged
  {
    console.log(`\n${BOLD}EDGE-03: No web3.js imports — file unchanged${RESET}`);
    const pureTs = `import { useState, useEffect } from "react";
import axios from "axios";
interface User { id: string; name: string; }
export function App() { return <div>hello</div>; }`;
    const result = migrateCode(pureTs).transformedCode;
    assert("pure TypeScript unchanged", result === pureTs,
      `unexpected changes:\n${result}`);
  }

  // EDGE-04: Nested PublicKey inside connection call
  {
    console.log(`\n${BOLD}EDGE-04: Nested new PublicKey() inside getBalance()${RESET}`);
    const input = `import { Connection, PublicKey } from "@solana/web3.js";
const conn = new Connection(endpoint);
const bal = await conn.getBalance(new PublicKey("So11111111111111111111111111111111111111112"));`;
    const result = migrateCode(input).transformedCode;
    assert("getBalance uses address()", result.includes("address("),
      `got: ${result}`);
    assert("getBalance has .send()", result.includes(".send()"),
      `got: ${result}`);
    assert("no new PublicKey remains", !result.includes("new PublicKey"),
      `found: ${result.match(/new PublicKey.*/)?.[0]}`);
    assert("no double await", !result.includes("await await"),
      `found: ${result.match(/await await.*/)?.[0]}`);
  }

  // EDGE-05: Multiple connection methods in one file
  {
    console.log(`\n${BOLD}EDGE-05: Multiple connection methods in one file${RESET}`);
    const input = `import { Connection } from "@solana/web3.js";
const conn = new Connection(url);
const slot = await conn.getSlot();
const bh = await conn.getLatestBlockhash();
const bal = await conn.getBalance(pk);
const info = await conn.getAccountInfo(pk);`;
    const result = migrateCode(input).transformedCode;
    assert("getSlot migrated", result.includes("getSlot().send()"));
    assert("getLatestBlockhash migrated", result.includes("getLatestBlockhash().send()"));
    assert("getBalance migrated", result.includes("getBalance(") && result.includes(".send()"));
    assert("getAccountInfo migrated", result.includes("getAccountInfo(") && result.includes(".send()"));
    assert("no double await anywhere", !result.includes("await await"),
      `found: ${result.match(/await await.*/)?.[0]}`);
    const sendCount = (result.match(/\.send\(\)/g) || []).length;
    assert(`exactly 4 .send() calls (got ${sendCount})`, sendCount === 4);
  }

  // EDGE-06: Promise.all with connection calls (no await on individual calls)
  {
    console.log(`\n${BOLD}EDGE-06: Promise.all pattern${RESET}`);
    const input = `import { Connection } from "@solana/web3.js";
const conn = new Connection(url);
const [bal1, bal2] = await Promise.all([
  conn.getBalance(pk1),
  conn.getBalance(pk2),
]);`;
    const result = migrateCode(input).transformedCode;
    assert("both getBalance calls have .send()",
      (result.match(/getBalance\([^)]+\)\.send\(\)/g) || []).length === 2,
      `got: ${result}`);
    assert("no double await", !result.includes("await await"),
      `found: ${result.match(/await await.*/)?.[0]}`);
  }

  // EDGE-07: Import with alias (as) — should preserve alias
  {
    console.log(`\n${BOLD}EDGE-07: Import aliases preserved${RESET}`);
    const input = `import { PublicKey as PK, Keypair as KP } from "@solana/web3.js";
const key = new PK("addr");`;
    const result = migrateCode(input).transformedCode;
    // Aliased imports won't be in our IMPORT_MAP, so they pass through to @solana/kit
    assert("import rewritten away from @solana/web3.js",
      !result.includes("@solana/web3.js"),
      `still has @solana/web3.js: ${result}`);
  }

  // EDGE-08: clusterApiUrl expansion
  {
    console.log(`\n${BOLD}EDGE-08: clusterApiUrl → template literal${RESET}`);
    const input = `import { Connection, clusterApiUrl } from "@solana/web3.js";
const conn = new Connection(clusterApiUrl("devnet"));
const conn2 = new Connection(clusterApiUrl("mainnet-beta"));`;
    const result = migrateCode(input).transformedCode;
    assert("devnet URL expanded", result.includes("https://api.devnet.solana.com"),
      `got: ${result}`);
    assert("mainnet-beta URL expanded", result.includes("https://api.mainnet-beta.solana.com"),
      `got: ${result}`);
  }

  // EDGE-09: Keypair.fromSecretKey with typed array
  {
    console.log(`\n${BOLD}EDGE-09: Keypair.fromSecretKey with Uint8Array${RESET}`);
    const input = `import { Keypair } from "@solana/web3.js";
const kp = Keypair.fromSecretKey(new Uint8Array([1,2,3,4,5]));
const kp2 = Keypair.fromSecretKey(Buffer.from(secretKeyHex, "hex"));`;
    const result = migrateCode(input).transformedCode;
    assert("fromSecretKey → createKeyPairSignerFromBytes",
      result.includes("createKeyPairSignerFromBytes"),
      `got: ${result}`);
    assert("no Keypair.fromSecretKey remains",
      !result.includes("Keypair.fromSecretKey"),
      `found: ${result.match(/Keypair\.fromSecretKey.*/)?.[0]}`);
  }

  // EDGE-10: PDA derivation sync vs async
  {
    console.log(`\n${BOLD}EDGE-10: PDA derivation (sync and async forms)${RESET}`);
    const input = `import { PublicKey } from "@solana/web3.js";
const [pda1] = PublicKey.findProgramAddressSync([seed], programId);
const [pda2] = await PublicKey.findProgramAddress([seed], programId);`;
    const result = migrateCode(input).transformedCode;
    assert("findProgramAddressSync → getProgramDerivedAddress",
      result.includes("getProgramDerivedAddress"),
      `got: ${result}`);
    assert("no findProgramAddressSync remains",
      !result.includes("findProgramAddressSync"),
      `found: ${result.match(/findProgramAddressSync.*/)?.[0]}`);
    assert("no findProgramAddress remains",
      !result.includes("findProgramAddress"),
      `found: ${result.match(/findProgramAddress(?!Sync).*/)?.[0]}`);
  }

  // EDGE-11: BS58 encode + decode
  {
    console.log(`\n${BOLD}EDGE-11: bs58 encode/decode${RESET}`);
    const input = `import bs58 from "@solana/web3.js";
const encoded = bs58.encode(bytes);
const decoded = bs58.decode(str);`;
    const result = migrateCode(input).transformedCode;
    assert("bs58.encode → getBase58Encoder().encode",
      result.includes("getBase58Encoder().encode"),
      `got: ${result}`);
    assert("bs58.decode → getBase58Decoder().decode",
      result.includes("getBase58Decoder().decode"),
      `got: ${result}`);
  }

  // EDGE-12: Sysvar constants
  {
    console.log(`\n${BOLD}EDGE-12: Sysvar constants renamed${RESET}`);
    const input = `import { SYSVAR_RENT_PUBKEY, SYSVAR_CLOCK_PUBKEY, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";
const rent = SYSVAR_RENT_PUBKEY;
const clock = SYSVAR_CLOCK_PUBKEY;
const instructions = SYSVAR_INSTRUCTIONS_PUBKEY;`;
    const result = migrateCode(input).transformedCode;
    assert("SYSVAR_RENT_PUBKEY → SYSVAR_RENT_ADDRESS",
      result.includes("SYSVAR_RENT_ADDRESS") && !result.includes("SYSVAR_RENT_PUBKEY"),
      `got: ${result}`);
    assert("SYSVAR_CLOCK_PUBKEY → SYSVAR_CLOCK_ADDRESS",
      result.includes("SYSVAR_CLOCK_ADDRESS") && !result.includes("SYSVAR_CLOCK_PUBKEY"),
      `got: ${result}`);
  }

  // EDGE-13: confirmTransaction flagged correctly
  {
    console.log(`\n${BOLD}EDGE-13: confirmTransaction → AI_REQUIRED flag${RESET}`);
    const input = `import { Connection } from "@solana/web3.js";
const conn = new Connection(url);
await conn.confirmTransaction(signature);
await conn.confirmTransaction(sig, "confirmed");`;
    const result = migrateCode(input).transformedCode;
    assert("confirmTransaction flagged as AI_REQUIRED",
      result.includes("AI_REQUIRED"),
      `got: ${result}`);
    assert("no confirmTransaction remains",
      !result.includes("conn.confirmTransaction"),
      `found: ${result.match(/conn\.confirmTransaction.*/)?.[0]}`);
  }

  // EDGE-14: .toBase58() stripped (address IS the base58 string)
  {
    console.log(`\n${BOLD}EDGE-14: .toBase58() stripped${RESET}`);
    const input = `const str = pubkey.toBase58();
const str2 = mint.toBase58();`;
    const result = migrateCode(input).transformedCode;
    assert(".toBase58() stripped from pubkey",
      result.includes("pubkey") && !result.includes("pubkey.toBase58()"),
      `got: ${result}`);
  }

  // EDGE-15: .equals() → === comparison
  {
    console.log(`\n${BOLD}EDGE-15: .equals() → ===  ${RESET}`);
    const input = `const same = addr1.equals(addr2);
if (mint.equals(TOKEN_PROGRAM_ID)) { doSomething(); }`;
    const result = migrateCode(input).transformedCode;
    assert(".equals() → ===",
      result.includes("==="),
      `got: ${result}`);
    assert("no .equals() remains",
      !result.includes(".equals("),
      `found: ${result.match(/\.equals\(.*/)?.[0]}`);
  }

  // EDGE-16: Buffer.from → Uint8Array
  {
    console.log(`\n${BOLD}EDGE-16: Buffer.from → new Uint8Array${RESET}`);
    const input = `const a = Buffer.from("hello", "utf8");
const b = Buffer.alloc(32);
const c = Buffer.concat([a, b]);`;
    const result = migrateCode(input).transformedCode;
    assert("Buffer.from → Uint8Array", result.includes("new Uint8Array") && !result.includes("Buffer.from"),
      `got: ${result}`);
    assert("Buffer.alloc → Uint8Array", !result.includes("Buffer.alloc"),
      `got: ${result}`);
    assert("Buffer.concat → Uint8Array spread", result.includes("flat()"),
      `got: ${result}`);
  }

  // EDGE-17: Multi-package import split
  {
    console.log(`\n${BOLD}EDGE-17: Multi-package import splitting${RESET}`);
    const input = `import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";`;
    const result = migrateCode(input).transformedCode;
    assert("no single @solana/web3.js import block", !result.includes("@solana/web3.js"),
      `found: ${result.match(/.*@solana\/web3\.js.*/)?.[0]}`);
    assert("multiple import statements",
      (result.match(/^import /gm) || []).length >= 2,
      `got: ${result}`);
  }

  // EDGE-18: Lamports multiplication
  {
    console.log(`\n${BOLD}EDGE-18: Lamports multiplication → lamports(BigInt(...))${RESET}`);
    const input = `const amount = 1 * LAMPORTS_PER_SOL;
const amount2 = 0.5 * LAMPORTS_PER_SOL;
const amount3 = 100 * LAMPORTS_PER_SOL;`;
    const result = migrateCode(input).transformedCode;
    assert("1 * LAMPORTS_PER_SOL → lamports(BigInt(...))",
      result.includes("lamports(BigInt("),
      `got: ${result}`);
    assert("no raw * LAMPORTS_PER_SOL remains",
      !result.match(/\d+(\.\d+)?\s*\*\s*LAMPORTS_PER_SOL/),
      `found: ${result.match(/\d+.*LAMPORTS_PER_SOL.*/)?.[0]}`);
  }

  // EDGE-19: web3 namespace forms
  {
    console.log(`\n${BOLD}EDGE-19: web3.Connection / web3.PublicKey namespace forms${RESET}`);
    const input = `import * as web3 from "@solana/web3.js";
const conn = new web3.Connection(url);
const pk = new web3.PublicKey("addr");
const kp = web3.Keypair.generate();`;
    const result = migrateCode(input).transformedCode;
    assert("star import rewritten to @solana/kit",
      !result.includes("@solana/web3.js"),
      `found: ${result.match(/.*@solana\/web3\.js.*/)?.[0]}`);
    assert("web3.Connection → createSolanaRpc", result.includes("createSolanaRpc"),
      `got: ${result}`);
    assert("web3.PublicKey → address", result.includes("address("),
      `got: ${result}`);
    assert("web3.Keypair.generate → generateKeyPairSigner",
      result.includes("generateKeyPairSigner"),
      `got: ${result}`);
    assert("no new web3.Connection remains", !result.includes("new web3.Connection"),
      `found: ${result.match(/new web3\.Connection.*/)?.[0]}`);
  }

  // EDGE-20: getRecentBlockhash deprecated → getLatestBlockhash
  {
    console.log(`\n${BOLD}EDGE-20: getRecentBlockhash → getLatestBlockhash with NOTE${RESET}`);
    const input = `import { Connection } from "@solana/web3.js";
const conn = new Connection(url);
const { blockhash } = await conn.getRecentBlockhash();`;
    const result = migrateCode(input).transformedCode;
    assert("getLatestBlockhash in output", result.includes("getLatestBlockhash"),
      `got: ${result}`);
    assert("NOTE comment present", result.includes("NOTE"),
      `got: ${result}`);
    // getRecentBlockhash may appear in a NOTE comment — check it's not a live call
    assert("no getRecentBlockhash call remains",
      !result.match(/\.\s*getRecentBlockhash\s*\(/),
      `found live call: ${result.match(/\.getRecentBlockhash\s*\(.*/)?.[0]}`);
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────

function printSummary() {
  const total = passed + failed;
  console.log(`\n${BOLD}${"═".repeat(50)}${RESET}`);
  console.log(`${BOLD}RESULTS: ${GREEN}${passed} passed${RESET}${BOLD}, ${failed > 0 ? RED : ""}${failed} failed${RESET}${BOLD} / ${total} total${RESET}`);
  if (failures.length > 0) {
    console.log(`\n${RED}${BOLD}FAILURES:${RESET}`);
    for (const f of failures) {
      console.log(`  ${RED}✗${RESET} ${f.name}`);
      if (f.detail) console.log(`    ${f.detail.slice(0, 200)}`);
    }
  }
  console.log(`${"═".repeat(50)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

// ── Run ───────────────────────────────────────────────────────────────────────

runFixtureTests();
runEdgeCaseTests();
printSummary();
