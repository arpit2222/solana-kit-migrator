import { createSolanaRpc } from "@solana/rpc";
import { address } from "@solana/addresses";
import { LAMPORTS_PER_SOL } from "@solana/kit";

const connection = createSolanaRpc("https://api.devnet.solana.com");
const pubkey = address("So11111111111111111111111111111111111111112");

async function getBalance() {
  const balance = await connection.getBalance(pubkey).send();
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  const balanceWithCommitment = await connection.getBalance(pubkey, "confirmed").send();
  return balance;
}
