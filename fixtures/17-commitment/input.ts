import { Connection, Commitment } from "@solana/web3.js";

const commitment: Commitment = "confirmed";

async function withCommitment(connection: Connection) {
  const slot = await connection.getSlot(commitment);
  const bh = await connection.getLatestBlockhash(commitment);
  const info = await connection.getAccountInfo(pubkey, commitment);
  return { slot, bh, info };
}
