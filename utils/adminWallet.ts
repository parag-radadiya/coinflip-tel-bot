import { Keypair } from "@solana/web3.js";
import fs from "fs";

// Load wallet from the Solana config file
const secretKey = JSON.parse(fs.readFileSync("/Users/radadiyaashvinbhai/.config/solana/id.json").toString());

console.log("Admin wallet secret key loaded");

const adminWallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));
// 21gnLHWc9wxX9supvwQPyLFXqMGkCKTC17hxmV3rEPkhpcfaeHgZQoMejfMWbZWip8xdzbrtRApbMLi8au1g6VFB
console.log("Admin Wallet Public Key:", adminWallet.publicKey.toBase58());
export default adminWallet;
