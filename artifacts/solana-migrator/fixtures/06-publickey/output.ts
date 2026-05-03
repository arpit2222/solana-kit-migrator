import { address, getProgramDerivedAddress } from "@solana/addresses";

const mint = address("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const owner = address(ownerBuffer);

// Deriving PDAs
const [pda, bump] = await getProgramDerivedAddress({
  programAddress: programId,
  seeds: [Buffer.from("seed"), mint.toBuffer()],
});

const [ata] = await getProgramDerivedAddress({
  programAddress: ASSOCIATED_TOKEN_PROGRAM_ID,
  seeds: [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
});

console.log(mint);
console.log(pda);
