import { LAMPORTS_PER_SOL } from "@solana/kit";
import { createSolanaRpc } from "@solana/rpc";
import { address } from "@solana/addresses";

const connection = createSolanaRpc("https://api.devnet.solana.com");
const addr = address("11111111111111111111111111111111");

async function main() {
  const solAmount = 1.5;
  const lamports = solAmount * LAMPORTS_PER_SOL;

  await connection.requestAirdrop(addr, lamports).send();
  await connection.requestAirdrop(addr, 2 * LAMPORTS_PER_SOL).send();
}
