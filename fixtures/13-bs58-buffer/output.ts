import { address, getAddressEncoder } from "@solana/addresses";
import { getBase58Encoder } from "@solana/codecs";

const encoded = getBase58Encoder().encode(Buffer.from("hello world"));
const decoded = getBase58Encoder().decode(encoded);

const pubkey = address("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const pubkeyBytes = getAddressEncoder().encode(pubkey);
const pubkeyBuffer = getAddressEncoder().encode(pubkey);
const pubkeyB58 = pubkey;
