import { Router } from "express";
import { GetCoverageResponse, GetExamplesResponse } from "@workspace/api-zod";

const router = Router();

// GET /coverage
router.get("/coverage", (_req, res) => {
  const response = GetCoverageResponse.parse({
    overall: 78,
    totalTransforms: 32,
    reposTestedCount: 5,
    reposTested: [
      "solana-labs/example-helloworld",
      "coral-xyz/anchor",
      "metaplex-foundation/mpl-token-metadata",
      "jup-ag/jupiter-core",
      "dialectlabs/sdk",
    ],
    categories: [
      {
        name: "imports",
        description: "Rewrite @solana/web3.js named imports to new split packages (@solana/rpc, @solana/addresses, @solana/signers, etc.)",
        coveragePercent: 100,
        automated: true,
        transformCount: 8,
      },
      {
        name: "connection",
        description: "Migrate Connection class to createSolanaRpc() and add .send() to all RPC calls",
        coveragePercent: 90,
        automated: true,
        transformCount: 6,
      },
      {
        name: "keypair",
        description: "Migrate Keypair to generateKeyPairSigner / createKeyPairSignerFromBytes, rewrite .publicKey to .address",
        coveragePercent: 85,
        automated: true,
        transformCount: 5,
      },
      {
        name: "publickey",
        description: "Migrate PublicKey to address(), findProgramAddressSync to getProgramDerivedAddress, TOKEN_PROGRAM_ID constants",
        coveragePercent: 95,
        automated: true,
        transformCount: 7,
      },
      {
        name: "transaction",
        description: "Transaction building pipeline is complex and non-deterministic — core patterns flagged for AI-assisted migration",
        coveragePercent: 30,
        automated: false,
        transformCount: 3,
      },
      {
        name: "buffer",
        description: "Migrate bs58.encode/decode to getBase58Encoder/Decoder, Buffer.from to Uint8Array",
        coveragePercent: 100,
        automated: true,
        transformCount: 2,
      },
      {
        name: "lamports",
        description: "Migrate LAMPORTS_PER_SOL and related constants to new @solana/kit imports",
        coveragePercent: 100,
        automated: true,
        transformCount: 1,
      },
    ],
  });

  res.json(response);
});

// GET /examples
router.get("/examples", (_req, res) => {
  const response = GetExamplesResponse.parse({
    examples: [
      {
        id: "ex-1",
        title: "Import rewrites",
        category: "imports",
        before: `import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';`,
        after: `import { Connection } from '@solana/rpc';
import { Keypair } from '@solana/signers';
import { Address } from '@solana/addresses';
import { LAMPORTS_PER_SOL } from '@solana/kit';`,
        description: "All named imports from @solana/web3.js are remapped to their new split-package locations.",
        flaggedForAI: false,
      },
      {
        id: "ex-2",
        title: "Connection → RPC client",
        category: "connection",
        before: `const connection = new Connection('https://api.mainnet-beta.solana.com');
const balance = await connection.getBalance(publicKey);
const info = await connection.getAccountInfo(address);`,
        after: `const connection = createSolanaRpc('https://api.mainnet-beta.solana.com');
const balance = await connection.getBalance(publicKey).send();
const info = await connection.getAccountInfo(address).send();`,
        description: "new Connection() becomes createSolanaRpc(). All RPC methods now use the .send() async pattern.",
        flaggedForAI: false,
      },
      {
        id: "ex-3",
        title: "Keypair migration",
        category: "keypair",
        before: `const keypair = Keypair.generate();
const fromSeed = Keypair.fromSecretKey(secretKeyBytes);
console.log(keypair.publicKey.toBase58());`,
        after: `const keypair = await generateKeyPairSigner();
const fromSeed = await createKeyPairSignerFromBytes(secretKeyBytes);
console.log(keypair.address);`,
        description: "Keypair factory methods become async. The .publicKey property becomes .address.",
        flaggedForAI: false,
      },
      {
        id: "ex-4",
        title: "PublicKey → address()",
        category: "publickey",
        before: `const mint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const [pda] = PublicKey.findProgramAddressSync([Buffer.from('seed')], programId);
const tokenProgram = TOKEN_PROGRAM_ID;`,
        after: `const mint = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const [pda] = await getProgramDerivedAddress({ programAddress: programId, seeds: [new Uint8Array('seed')] });
const tokenProgram = TOKEN_PROGRAM_ADDRESS;`,
        description: "new PublicKey() is replaced by the address() function. PDA derivation becomes async. TOKEN_PROGRAM_ID constants are renamed.",
        flaggedForAI: false,
      },
      {
        id: "ex-5",
        title: "Transaction building (AI-assisted)",
        category: "transaction",
        before: `const tx = new Transaction().add(transferInstruction);
await sendAndConfirmTransaction(connection, tx, [payer]);`,
        after: `/* TODO: AI_REQUIRED — new Transaction().add() → pipe(createTransaction({version: 0}), appendTransactionMessageInstructions([...])) */
/* TODO: AI_REQUIRED — sendAndConfirmTransaction → use sendAndConfirmTransactionFactory() */`,
        description: "The new transaction pipeline is a significant architectural change. Complex cases are flagged for AI-assisted migration.",
        flaggedForAI: true,
      },
      {
        id: "ex-6",
        title: "Buffer / encoding",
        category: "buffer",
        before: `const encoded = bs58.encode(myBuffer);
const raw = Buffer.from(data, 'base64');`,
        after: `const encoded = getBase58Encoder().encode(myBuffer);
const raw = new Uint8Array(data);`,
        description: "bs58 encoding uses the new codec pattern. Buffer is replaced with Uint8Array throughout.",
        flaggedForAI: false,
      },
    ],
  });

  res.json(response);
});

export default router;
