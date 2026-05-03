import { createSolanaRpc } from "@solana/rpc";

const connection = createSolanaRpc("https://api.mainnet-beta.solana.com");
const devnet = createSolanaRpc("https://api.devnet.solana.com", "confirmed");
const custom = createSolanaRpc(clusterApiUrl("mainnet-beta"), {
  commitment: "finalized",
});
