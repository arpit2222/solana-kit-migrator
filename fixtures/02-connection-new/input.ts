import { Connection } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const devnet = new Connection("https://api.devnet.solana.com", "confirmed");
const custom = new Connection(clusterApiUrl("mainnet-beta"), {
  commitment: "finalized",
});
