import { createSolanaRpc } from "@solana/rpc";
import { address, Address } from "@solana/addresses";
import { GetProgramAccountsFilter } from "@solana/rpc-types";

const connection = createSolanaRpc("https://api.mainnet-beta.solana.com");
const TOKEN_PROGRAM = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

async function getTokenAccounts(owner: Address) {
  const filters: GetProgramAccountsFilter[] = [
    { dataSize: 165 },
    { memcmp: { offset: 32, bytes: owner } },
  ];

  const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM, { filters }).send();
  const byOwner = await connection.getTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM,
  }).send();
  return accounts;
}
