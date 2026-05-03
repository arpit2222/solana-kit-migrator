import { createSolanaRpc } from "@solana/rpc";
import { generateKeyPairSigner } from "@solana/signers";

const connection = createSolanaRpc("https://api.devnet.solana.com");
const payer = await generateKeyPairSigner();

async function simulate(tx: Parameters<typeof connection.simulateTransaction>[0]) {
  const result = await connection.simulateTransaction(tx).send();
  if (result.value.err) {
    throw new Error(`Simulation failed: ${JSON.stringify(result.value.err)}`);
  }
  const logs = result.value.logs ?? [];
  return logs;
}
