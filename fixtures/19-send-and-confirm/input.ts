import {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

async function sendSOL(
  connection: Connection,
  payer: Keypair,
  recipient: string,
  amount: number
) {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: new PublicKey(recipient),
      lamports: amount * LAMPORTS_PER_SOL,
    })
  );

  const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
  console.log("Signature:", sig);
  return sig;
}
