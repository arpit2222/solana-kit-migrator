import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

function transferSOL(from: PublicKey, to: PublicKey, amountSOL: number) {
  const transferIx = SystemProgram.transfer({
    fromPubkey: from,
    toPubkey: to,
    lamports: amountSOL * LAMPORTS_PER_SOL,
  });

  const createIx = SystemProgram.createAccount({
    fromPubkey: from,
    newAccountPubkey: to,
    lamports: 1_000_000,
    space: 165,
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  });

  return [transferIx, createIx];
}
