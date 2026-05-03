import { Connection } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");

async function getCurrentSlot() {
  const slot = await connection.getSlot();
  const slotWithCommitment = await connection.getSlot("finalized");
  const version = await connection.getVersion();
  const epochInfo = await connection.getEpochInfo();
  return { slot, slotWithCommitment, version, epochInfo };
}
