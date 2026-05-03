import { generateKeyPairSigner, createKeyPairSignerFromBytes } from "@solana/signers";
import * as fs from "fs";

// Generate a new keypair
const payer = await generateKeyPairSigner();

// Load from secret key bytes
const secretKey = JSON.parse(fs.readFileSync("/path/to/keypair.json", "utf8"));
const wallet = await createKeyPairSignerFromBytes(Uint8Array.from(secretKey));

console.log("Public key:", payer.address);
console.log("Wallet:", wallet.address);
