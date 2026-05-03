import { LAMPORTS_PER_SOL, Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");
const address = new PublicKey("11111111111111111111111111111111");

async function main() {
  const solAmount = 1.5;
  const lamports = solAmount * LAMPORTS_PER_SOL;

  await connection.requestAirdrop(address, lamports);
  await connection.requestAirdrop(address, 2 * LAMPORTS_PER_SOL);
}
