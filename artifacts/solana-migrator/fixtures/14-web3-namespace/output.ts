import * as web3 from "@solana/kit";

const connection = createSolanaRpc("https://api.devnet.solana.com");
const keypair = await generateKeyPairSigner();
const pubkey = address("11111111111111111111111111111111");
const tx = createTransactionMessage({ version: 0 });

async function main() {
  const balance = await connection.getBalance(keypair.address).send();
  return balance;
}
