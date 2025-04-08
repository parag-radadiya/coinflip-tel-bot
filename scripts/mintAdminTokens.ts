import { Connection, PublicKey, Keypair, clusterApiUrl } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import dotenv from 'dotenv';
import bs58 from 'bs58';

// Load environment variables
dotenv.config();

// --- Configuration ---
const USDT_MINT_ADDRESS = "DxmaJTq9UtcQEnnHRED6ZsXcp79gQY5XUV8USSSyiUfa";
const TOKEN_MINT_ADDRESS = "BNDvNxhxhcRay8s5WK7wtpCwF9wGQiuUVo9zioGMtuS";
const USDT_DECIMALS = 6;
const TOKEN_DECIMALS = 9;
const AMOUNT_TO_MINT = 1000; // Amount for each token

// --- Helper Function to load Admin Wallet ---
function getAdminKeypair(): Keypair {
    const base58PrivateKey = process.env.ADMIN_WALLET_PRIVATE_KEY;
    if (!base58PrivateKey) {
        throw new Error("ADMIN_WALLET_PRIVATE_KEY not found in .env file");
    }
    try {
        const secretKey = bs58.decode(base58PrivateKey);
        if (secretKey.length !== 64) {
            throw new Error("Decoded secret key must be 64 bytes long.");
        }
        return Keypair.fromSecretKey(secretKey);
    } catch (error) {
        console.error("Error decoding or creating admin keypair:", error);
        throw new Error("Invalid admin private key format.");
    }
}

// --- Main Minting Function ---
const mintAdminTokens = async () => {
    const connection = new Connection(clusterApiUrl('devnet'), "confirmed");
    const adminWallet = getAdminKeypair();
    const usdtMintPublicKey = new PublicKey(USDT_MINT_ADDRESS);
    const tokenMintPublicKey = new PublicKey(TOKEN_MINT_ADDRESS);

    console.log(`Using Admin Wallet: ${adminWallet.publicKey.toBase58()}`);
    console.log(`Attempting to mint ${AMOUNT_TO_MINT} USDT and ${AMOUNT_TO_MINT} Custom Tokens...`);

    try {
        // --- Mint USDT ---
        console.log("\nMinting USDT...");
        const adminUsdtAta = await getOrCreateAssociatedTokenAccount(
            connection,
            adminWallet,          // Payer for ATA creation fee
            usdtMintPublicKey,    // Mint address
            adminWallet.publicKey // Owner of the ATA
        );
        console.log(`Admin USDT ATA: ${adminUsdtAta.address.toBase58()}`);

        const usdtAmountToMintRaw = BigInt(AMOUNT_TO_MINT * Math.pow(10, USDT_DECIMALS));
        console.log(`Raw USDT amount to mint: ${usdtAmountToMintRaw}`);

        const usdtMintTx = await mintTo(
            connection,
            adminWallet,          // Payer for minting fee
            usdtMintPublicKey,    // Mint address
            adminUsdtAta.address, // Destination ATA
            adminWallet,          // Mint authority
            usdtAmountToMintRaw   // Amount (raw)
        );
        console.log(`USDT Mint Transaction Signature: ${usdtMintTx}`);
        console.log(`${AMOUNT_TO_MINT} USDT minted successfully.`);

        // --- Mint Custom Token ---
        console.log("\nMinting Custom Token...");
        const adminTokenAta = await getOrCreateAssociatedTokenAccount(
            connection,
            adminWallet,          // Payer for ATA creation fee
            tokenMintPublicKey,   // Mint address
            adminWallet.publicKey // Owner of the ATA
        );
        console.log(`Admin Custom Token ATA: ${adminTokenAta.address.toBase58()}`);

        const tokenAmountToMintRaw = BigInt(AMOUNT_TO_MINT * Math.pow(10, TOKEN_DECIMALS));
         console.log(`Raw Custom Token amount to mint: ${tokenAmountToMintRaw}`);

        const tokenMintTx = await mintTo(
            connection,
            adminWallet,          // Payer for minting fee
            tokenMintPublicKey,   // Mint address
            adminTokenAta.address,// Destination ATA
            adminWallet,          // Mint authority
            tokenAmountToMintRaw  // Amount (raw)
        );
        console.log(`Custom Token Mint Transaction Signature: ${tokenMintTx}`);
        console.log(`${AMOUNT_TO_MINT} Custom Tokens minted successfully.`);

        console.log("\nFinished minting tokens to admin wallet.");

    } catch (error) {
        console.error('\nError minting tokens:', error);
        process.exit(1); // Exit with error code
    }
};

// --- Execute Script ---
mintAdminTokens();
