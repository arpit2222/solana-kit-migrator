import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");
const pubkey = new PublicKey("So11111111111111111111111111111111111111112");

async function getBalance() {
  const balance = await connection.getBalance(pubkey);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  const balanceWithCommitment = await connection.getBalance(pubkey, "confirmed");
  return balance;
}
