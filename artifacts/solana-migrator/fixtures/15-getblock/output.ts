import { createSolanaRpc } from "@solana/rpc";

const connection = createSolanaRpc("https://api.mainnet-beta.solana.com");

async function fetchBlocks() {
  const blockTime = await connection.getBlockTime(12345678).send();
  const blocks = await connection.getBlocks(12345600, 12345678).send();
  const perfSamples = await connection.getRecentPerformanceSamples(5).send();
  const sigStatuses = await connection.getSignatureStatuses(["sig1", "sig2"]).send();
  return { blockTime, blocks, perfSamples, sigStatuses };
}
