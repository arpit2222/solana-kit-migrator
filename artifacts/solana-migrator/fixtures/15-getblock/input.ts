import { Connection } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");

async function fetchBlocks() {
  const blockTime = await connection.getBlockTime(12345678);
  const blocks = await connection.getBlocks(12345600, 12345678);
  const perfSamples = await connection.getRecentPerformanceSamples(5);
  const sigStatuses = await connection.getSignatureStatuses(["sig1", "sig2"]);
  return { blockTime, blocks, perfSamples, sigStatuses };
}
