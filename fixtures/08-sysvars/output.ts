import {
  SYSVAR_RENT_ADDRESS,
  SYSVAR_CLOCK_ADDRESS,
  SYSVAR_INSTRUCTIONS_ADDRESS,
  SYSVAR_STAKE_HISTORY_ADDRESS,
  SYSVAR_EPOCH_SCHEDULE_ADDRESS,
} from "@solana/sysvars";
import { Address } from "@solana/addresses";

function buildInstruction(programId: Address) {
  return {
    keys: [
      { pubkey: SYSVAR_RENT_ADDRESS, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_ADDRESS, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_ADDRESS, isSigner: false, isWritable: false },
    ],
    programId,
    data: Buffer.alloc(0),
  };
}
