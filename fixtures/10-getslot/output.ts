import { createSolanaRpc } from "@solana/rpc";

const connection = createSolanaRpc("https://api.mainnet-beta.solana.com");

async function getCurrentSlot() {
  const slot = await connection.getSlot().send();
  const slotWithCommitment = await connection.getSlot("finalized").send();
  const version = await connection.getVersion().send();
  const epochInfo = await connection.getEpochInfo().send();
  return { slot, slotWithCommitment, version, epochInfo };
}
