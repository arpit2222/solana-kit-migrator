import {
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_STAKE_HISTORY_PUBKEY,
  SYSVAR_EPOCH_SCHEDULE_PUBKEY,
  PublicKey,
} from "@solana/web3.js";

function buildInstruction(programId: PublicKey) {
  return {
    keys: [
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId,
    data: Buffer.alloc(0),
  };
}
