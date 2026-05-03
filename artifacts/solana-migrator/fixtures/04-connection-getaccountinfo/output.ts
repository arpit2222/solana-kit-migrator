import { createSolanaRpc } from "@solana/rpc";
import { address, Address } from "@solana/addresses";
import { AccountInfo } from "@solana/accounts";

async function fetchAccount(connection: ReturnType<typeof createSolanaRpc>, addr: Address) {
  const info: AccountInfo<Buffer> | null = await connection.getAccountInfo(addr).send();
  if (!info) throw new Error("Account not found");
  return info.data;
}
