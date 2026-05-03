import { createSolanaRpc } from "@solana/rpc";
import { Commitment } from "@solana/rpc-types";

const commitment: Commitment = "confirmed";

async function withCommitment(connection: ReturnType<typeof createSolanaRpc>) {
  const slot = await connection.getSlot(commitment).send();
  const bh = await connection.getLatestBlockhash(commitment).send();
  const info = await connection.getAccountInfo(pubkey, commitment).send();
  return { slot, bh, info };
}
