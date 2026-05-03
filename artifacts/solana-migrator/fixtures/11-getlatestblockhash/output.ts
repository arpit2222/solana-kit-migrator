import { createSolanaRpc } from "@solana/rpc";

const connection = createSolanaRpc("https://api.devnet.solana.com");

async function main() {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash().send();
  const confirmed = await connection.getLatestBlockhash("confirmed").send();
  const recent = await connection.getRecentBlockhash().send();
  return { blockhash, lastValidBlockHeight };
}
