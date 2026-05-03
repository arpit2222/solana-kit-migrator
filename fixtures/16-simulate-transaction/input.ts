import { Connection, Transaction, Keypair } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");
const payer = Keypair.generate();

async function simulate(tx: Transaction) {
  const result = await connection.simulateTransaction(tx);
  if (result.value.err) {
    throw new Error(`Simulation failed: ${JSON.stringify(result.value.err)}`);
  }
  const logs = result.value.logs ?? [];
  return logs;
}
