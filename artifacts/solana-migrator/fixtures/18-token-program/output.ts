import {
  TOKEN_PROGRAM_ADDRESS,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
} from "@solana/spl-token";
import { address, Address, getProgramDerivedAddress } from "@solana/addresses";

async function getATAAddress(owner: Address, mint: Address): Promise<Address> {
  const [ata] = await getProgramDerivedAddress({
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    seeds: [owner, TOKEN_PROGRAM_ADDRESS, mint],
  });
  return ata;
}
