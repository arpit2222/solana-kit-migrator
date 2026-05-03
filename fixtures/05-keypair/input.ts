import { Keypair } from "@solana/web3.js";
import * as fs from "fs";

// Generate a new keypair
const payer = Keypair.generate();

// Load from secret key bytes
const secretKey = JSON.parse(fs.readFileSync("/path/to/keypair.json", "utf8"));
const wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));

console.log("Public key:", payer.publicKey.toBase58());
console.log("Wallet:", wallet.publicKey.toString());
