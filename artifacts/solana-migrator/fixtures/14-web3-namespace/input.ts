import * as web3 from "@solana/web3.js";

const connection = new web3.Connection("https://api.devnet.solana.com");
const keypair = web3.Keypair.generate();
const pubkey = new web3.PublicKey("11111111111111111111111111111111");
const tx = new web3.Transaction();

async function main() {
  const balance = await connection.getBalance(keypair.publicKey);
  return balance;
}
