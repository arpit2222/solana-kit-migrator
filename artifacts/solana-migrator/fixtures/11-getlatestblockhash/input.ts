import { Connection } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");

async function main() {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const confirmed = await connection.getLatestBlockhash("confirmed");
  const recent = await connection.getRecentBlockhash();
  return { blockhash, lastValidBlockHeight };
}
