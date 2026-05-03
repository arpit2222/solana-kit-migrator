import { createSolanaRpc } from "@solana/rpc";
import { generateKeyPairSigner } from "@solana/signers";
import { createTransactionMessage, appendTransactionMessageInstructions } from "@solana/transaction-messages";
import { getTransferSolInstruction } from "@solana/programs";
import { LAMPORTS_PER_SOL } from "@solana/kit";
import { address, Address } from "@solana/addresses";
/* TODO: AI_REQUIRED — sendAndConfirmTransaction needs structural rewrite:
   Use: import { sendAndConfirmTransactionFactory } from "@solana/transaction-confirmation";
   const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc });
   Build tx with pipe(createTransactionMessage({version:0}), ...) then await sendAndConfirm(tx, {commitment:"confirmed"}) */

async function sendSOL(
  connection: ReturnType<typeof createSolanaRpc>,
  payer: Awaited<ReturnType<typeof generateKeyPairSigner>>,
  recipient: string,
  amount: number
) {
  const tx = createTransactionMessage({ version: 0 });

  const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
  console.log("Signature:", sig);
  return sig;
}
