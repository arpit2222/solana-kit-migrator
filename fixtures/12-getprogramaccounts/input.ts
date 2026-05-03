import { Connection, PublicKey, GetProgramAccountsFilter } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

async function getTokenAccounts(owner: PublicKey) {
  const filters: GetProgramAccountsFilter[] = [
    { dataSize: 165 },
    { memcmp: { offset: 32, bytes: owner.toBase58() } },
  ];

  const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM, { filters });
  const byOwner = await connection.getTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM,
  });
  return accounts;
}
