import { Connection, PublicKey, AccountInfo } from "@solana/web3.js";

async function fetchAccount(connection: Connection, address: PublicKey) {
  const info: AccountInfo<Buffer> | null = await connection.getAccountInfo(address);
  if (!info) throw new Error("Account not found");
  return info.data;
}
