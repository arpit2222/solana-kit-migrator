import { getTransferSolInstruction, getCreateAccountInstruction } from "@solana/programs";
import { address, Address } from "@solana/addresses";
import { LAMPORTS_PER_SOL } from "@solana/kit";

function transferSOL(from: Address, to: Address, amountSOL: number) {
  const transferIx = getTransferSolInstruction({
    source: from,
    destination: to,
    amount: amountSOL * LAMPORTS_PER_SOL,
  });

  const createIx = getCreateAccountInstruction({
    payer: from,
    newAccount: to,
    lamports: 1_000_000,
    space: 165,
    programAddress: address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  });

  return [transferIx, createIx];
}
