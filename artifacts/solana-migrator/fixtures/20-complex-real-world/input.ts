/**
 * Real-world example: NFT minting client
 * Tests multiple categories simultaneously
 */
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/web3.js";
import bs58 from "bs58";

const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

async function mintNFT(
  connection: Connection,
  payer: Keypair,
  mintAuthority: Keypair
) {
  const mint = Keypair.generate();
  const [metadataPDA] = await PublicKey.findProgramAddress(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.publicKey.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );

  const balance = await connection.getBalance(payer.publicKey);
  const { blockhash } = await connection.getLatestBlockhash();
  const slot = await connection.getSlot();

  const rentExemption = await connection.getMinimumBalanceForRentExemption(82);

  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mint.publicKey,
    lamports: rentExemption,
    space: 82,
    programId: TOKEN_PROGRAM_ID,
  });

  const tx = new Transaction()
    .add(createAccountIx);
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer.publicKey;

  const sig = await sendAndConfirmTransaction(connection, tx, [payer, mint]);
  console.log("Minted:", mint.publicKey.toBase58());
  console.log("Metadata PDA:", metadataPDA.toString());
  console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL");
  console.log("Slot:", slot);
  console.log("Sig:", bs58.encode(Buffer.from(sig)));

  return { mint: mint.publicKey, metadataPDA, sig };
}
