import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

const encoded = bs58.encode(Buffer.from("hello world"));
const decoded = bs58.decode(encoded);

const pubkey = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const pubkeyBytes = pubkey.toBytes();
const pubkeyBuffer = pubkey.toBuffer();
const pubkeyB58 = pubkey.toBase58();
