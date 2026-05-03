import { PublicKey } from "@solana/web3.js";

const mint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const owner = new PublicKey(ownerBuffer);

// Deriving PDAs
const [pda, bump] = await PublicKey.findProgramAddress(
  [Buffer.from("seed"), mint.toBuffer()],
  programId
);

const [ata] = PublicKey.findProgramAddressSync(
  [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
  ASSOCIATED_TOKEN_PROGRAM_ID
);

console.log(mint.toBase58());
console.log(pda.toString());
