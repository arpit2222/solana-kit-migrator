/**
 * Real-world example: NFT minting client
 * Tests multiple categories simultaneously
 */
import { createSolanaRpc } from "@solana/rpc";
import { generateKeyPairSigner } from "@solana/signers";
import { address, Address, getProgramDerivedAddress } from "@solana/addresses";
import { createTransactionMessage } from "@solana/transaction-messages";
import { getCreateAccountInstruction } from "@solana/programs";
import { LAMPORTS_PER_SOL } from "@solana/kit";
import { SYSVAR_RENT_ADDRESS } from "@solana/sysvars";
import { TOKEN_PROGRAM_ADDRESS } from "@solana/spl-token";
import { getBase58Encoder } from "@solana/codecs";
/* TODO: AI_REQUIRED — sendAndConfirmTransaction needs structural rewrite:
   Use: import { sendAndConfirmTransactionFactory } from "@solana/transaction-confirmation";
   const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc });
   Build tx with pipe(createTransactionMessage({version:0}), ...) then await sendAndConfirm(tx, {commitment:"confirmed"}) */

const METADATA_PROGRAM_ID = address("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

async function mintNFT(
  connection: ReturnType<typeof createSolanaRpc>,
  payer: Awaited<ReturnType<typeof generateKeyPairSigner>>,
  mintAuthority: Awaited<ReturnType<typeof generateKeyPairSigner>>
) {
  const mint = await generateKeyPairSigner();
  const [metadataPDA] = await getProgramDerivedAddress({
    programAddress: METADATA_PROGRAM_ID,
    seeds: [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID,
      mint.address,
    ],
  });

  const balance = await connection.getBalance(payer.address).send();
  const { blockhash } = await connection.getLatestBlockhash().send();
  const slot = await connection.getSlot().send();

  const rentExemption = await connection.getMinimumBalanceForRentExemption(82).send();

  const createAccountIx = getCreateAccountInstruction({
    payer: payer.address,
    newAccount: mint.address,
    lamports: rentExemption,
    space: 82,
    programAddress: TOKEN_PROGRAM_ADDRESS,
  });

  const tx = createTransactionMessage({ version: 0 });

  const sig = await sendAndConfirmTransaction(connection, tx, [payer, mint]);
  console.log("Minted:", mint.address);
  console.log("Metadata PDA:", metadataPDA);
  console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL");
  console.log("Slot:", slot);
  console.log("Sig:", getBase58Encoder().encode(Buffer.from(sig)));

  return { mint: mint.address, metadataPDA, sig };
}
