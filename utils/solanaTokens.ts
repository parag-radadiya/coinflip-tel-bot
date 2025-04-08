import {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  Keypair,
  clusterApiUrl,
  SendTransactionError, // Import SendTransactionError
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  transfer,
  mintTo,
  getMint,
  getAccount,
  TOKEN_PROGRAM_ID,
  createTransferInstruction
} from "@solana/spl-token";
import bs58 from "bs58";

// Utility function for delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize connection to Solana network
// For production, use a more reliable endpoint
const connection = new Connection(clusterApiUrl('devnet'), "confirmed");

// devnet address are as belowed 
// Devnet Admin Wallet Public Key: 8MVqCcGqb9zhAwPNcKGcwMD7AQPWLHFWybfgRze1tV8V (Funded with 2 SOL)
// Devnet Admin Wallet Keypair File: devnet-admin-wallet.json
// Devnet USDT-like Token Mint: DxmaJTq9UtcQEnnHRED6ZsXcp79gQY5XUV8USSSyiUfa (6 decimals)
// Devnet Custom Token Mint: BNDvNxhxhcRay8s5WK7wtpCwF9wGQiuUVo9zioGMtuS

// Token Mint Addresses (Replace with actual token addresses)
const USDT_MINT = new PublicKey("DxmaJTq9UtcQEnnHRED6ZsXcp79gQY5XUV8USSSyiUfa"); // Updated Devnet USDT-like
const TOKEN_MINT = new PublicKey("BNDvNxhxhcRay8s5WK7wtpCwF9wGQiuUVo9zioGMtuS"); // Updated Devnet Custom Token

// Define token decimals
export const USDT_DECIMALS = 6;  // USDT has 6 decimal places
export const TOKEN_DECIMALS = 9; // Custom token has 9 decimal places
export const SOL_DECIMALS = 9;   // SOL has 9 decimal places (lamports)

// Import admin wallet from dedicated module
const adminWallet = getUserKeypair(process.env.ADMIN_WALLET_PRIVATE_KEY as string);


// Log the admin wallet public key for reference
console.log("Using Admin Wallet Public Key:", adminWallet.publicKey.toBase58());

/**
 * Convert user-friendly token amount to on-chain amount with decimals
 * @param {number} amount - User-friendly token amount
 * @param {number} decimals - Number of decimal places for the token
 * @returns {number} - On-chain token amount
 */
export function toTokenAmount(amount: number, decimals: number): number {
  return Math.floor(amount * Math.pow(10, decimals));
}

/**
 * Convert on-chain token amount to user-friendly amount
 * @param {number} amount - On-chain token amount
 * @param {number} decimals - Number of decimal places for the token
 * @returns {number} - User-friendly token amount
 */
export function fromTokenAmount(amount: number, decimals: number): number {
  return amount / Math.pow(10, decimals);
}

/**
 * Convert Base58 private key string to a Keypair
 * @param {string} base58PrivateKey - The user's private key in Base58 format
 * @returns {Keypair} - Solana Keypair
 */
export function getUserKeypair(base58PrivateKey: string): Keypair {
  try {
    const secretKey = bs58.decode(base58PrivateKey);
    if (secretKey.length !== 64) {
      throw new Error("Decoded secret key must be 64 bytes long.");
    }
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error("Error decoding or creating keypair:", error);
    throw new Error("Invalid private key format.");
  }
}

/**
 * Mint tokens to a recipient
 * @param {PublicKey} mintAddress - Token mint address
 * @param {Keypair} recipient - Recipient wallet
 * @param {number} amount - User-friendly token amount to mint
 * @param {number} decimals - Number of decimal places for the token
 */
async function mintTokens(
  mintAddress: PublicKey, 
  recipient: Keypair, 
  amount: number, 
  decimals: number
): Promise<void> {
  const mint = new PublicKey(mintAddress);
  const recipientATA = await getOrCreateAssociatedTokenAccount(
    connection,
    adminWallet,
    mint,
    recipient.publicKey
  );

  // Convert user-friendly amount to on-chain amount with decimals
  const onChainAmount = toTokenAmount(amount, decimals);

  await mintTo(
    connection,
    adminWallet,
    mint,
    recipientATA.address,
    adminWallet.publicKey,
    onChainAmount
  );
  console.log(
    `Minted ${amount} tokens (${onChainAmount} raw units) to ${recipient.publicKey.toBase58()} for mint ${mintAddress}`
  );
}

/**
 * Get token balance for a wallet
 * @param {Keypair} wallet - Wallet to check balance for
 * @param {PublicKey} mintAddress - Token mint address
 * @returns {number} - Raw token balance (with decimals)
 */
async function getBalance(wallet: Keypair, mintAddress: PublicKey): Promise<number> {
  const mint = new PublicKey(mintAddress);
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    adminWallet,
    mint,
    wallet.publicKey
  );

  const accountInfo = await getAccount(connection, ata.address);
  return Number(accountInfo.amount);
}

/**
 * Get wallet balances for both SOL and custom token
 * @param {Keypair} userWallet - The user's wallet keypair
 * @returns {Object} - Object containing SOL and token balances
 */
export async function getWalletBalance(userWallet: Keypair): Promise<{
  solBalance: number;
  tokenBalance: number;
  usdtBalance: number;
}> {
  try {
    // Get SOL balance
    const solBalance = await connection.getBalance(userWallet.publicKey);
    const solBalanceInSol = fromTokenAmount(solBalance, SOL_DECIMALS);
    
    // Get token balance
    let tokenBalance = 0;
    try {
      const rawTokenBalance = await getBalance(userWallet, TOKEN_MINT);
      tokenBalance = fromTokenAmount(rawTokenBalance, TOKEN_DECIMALS);
    } catch (error) {
      console.log("Error getting token balance:", error);
      // If there's an error getting token balance, we'll just return 0
    }
    
    // Get USDT balance
    let usdtBalance = 0;
    try {
      const rawUsdtBalance = await getBalance(userWallet, USDT_MINT);
      usdtBalance = fromTokenAmount(rawUsdtBalance, USDT_DECIMALS);
    } catch (error) {
      console.log("Error getting USDT balance:", error);
      // If there's an error getting USDT balance, we'll just return 0
    }
    
    return {
      solBalance: solBalanceInSol,
      tokenBalance: tokenBalance,
      usdtBalance: usdtBalance
    };
  } catch (error) {
    console.log("Error getting wallet balance:", error);
    throw new Error("Failed to retrieve wallet balance");
  }
}

export async function ensureUserHasLamports(user: Keypair): Promise<void> {
  const balance = await connection.getBalance(user.publicKey);
  if (balance < 1e7) {
    // Ensure user has at least 0.01 SOL (10,000,000 lamports)
    console.log("Airdropping SOL to user...");
    const airdropSignature = await connection.requestAirdrop(
      user.publicKey,
      1e9
    ); // 1 SOL
    await connection.confirmTransaction(airdropSignature, "confirmed");
  }
}

export async function buyTokens(userPrivateKey: string, tokenAmount: number): Promise<boolean> {
  try {
    if (tokenAmount <= 0) {
      throw new Error("Token amount must be greater than 0.");
    }
    console.log('userPrivateKey == ', userPrivateKey);
    
    if (!userPrivateKey) {
      throw new Error("User private key is required.");
    }
    const user = getUserKeypair(userPrivateKey);

    // Ensure user has enough SOL for transaction fees
    const balance = await connection.getBalance(user.publicKey);
    console.log('user.publicKey == ', user.publicKey);
    console.log('balance == ', balance);

    // Removed user lamport check - Admin will pay the fee.
    // if (balance < 1e7) {
    //   throw new Error("User does not have enough Lamports.");
    // }

    // Get or create associated token accounts
    const userUSDTAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminWallet,
      USDT_MINT,
      user.publicKey
    );
    const adminUSDTAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminWallet,
      USDT_MINT,
      adminWallet.publicKey
    );
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminWallet,
      TOKEN_MINT,
      user.publicKey
    );
    const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminWallet,
      TOKEN_MINT,
      adminWallet.publicKey
    );

    // here we are taking 1 usdt = 1 token so
    const usdtAmount = tokenAmount;

    // Convert user-friendly amounts to on-chain amounts with decimals
    const onChainUsdtAmount = toTokenAmount(usdtAmount, USDT_DECIMALS);
    const onChainTokenAmount = toTokenAmount(tokenAmount, TOKEN_DECIMALS);

    // Check user USDT balance
    const userUSDTBalance = await getBalance(user, USDT_MINT);
    if (userUSDTBalance < onChainUsdtAmount) {
      throw new Error("User does not have enough USDT.");
    }

    // Check admin Token balance
    const adminTokenBalance = await getBalance(adminWallet, TOKEN_MINT);
    if (adminTokenBalance < onChainTokenAmount) {
      throw new Error("Admin does not have enough tokens.");
    }

    console.log(
      "User USDT Balance before:",
      fromTokenAmount(await getBalance(user, USDT_MINT), USDT_DECIMALS)
    );
    console.log(
      "User Token Balance before:",
      fromTokenAmount(await getBalance(user, TOKEN_MINT), TOKEN_DECIMALS)
    );
    console.log(
      "Admin USDT Balance before:",
      fromTokenAmount(await getBalance(adminWallet, USDT_MINT), USDT_DECIMALS)
    );
    console.log(
      "Admin Token Balance before:",
      fromTokenAmount(await getBalance(adminWallet, TOKEN_MINT), TOKEN_DECIMALS)
    );

    // Create transaction
    let transaction = new Transaction();

    // Transfer USDT from user to admin
    transaction.add(
      createTransferInstruction(
        userUSDTAccount.address,
        adminUSDTAccount.address,
        user.publicKey,
        onChainUsdtAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Transfer Tokens from admin to user
    transaction.add(
      createTransferInstruction(
        adminTokenAccount.address,
        userTokenAccount.address,
        adminWallet.publicKey,
        onChainTokenAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Set the admin wallet as the fee payer
    transaction.feePayer = adminWallet.publicKey;

    // Sign and send transaction (Admin pays fee, both need to sign their respective transfers)
    await sendAndConfirmTransaction(connection, transaction, [
      adminWallet, // Fee payer listed first (though feePayer property is definitive)
      user,
    ]);

    console.log(
      "User USDT Balance after:",
      fromTokenAmount(await getBalance(user, USDT_MINT), USDT_DECIMALS)
    );
    console.log(
      "User Token Balance:",
      fromTokenAmount(await getBalance(user, TOKEN_MINT), TOKEN_DECIMALS)
    );
    console.log(
      "Admin USDT Balance:",
      fromTokenAmount(await getBalance(adminWallet, USDT_MINT), USDT_DECIMALS)
    );
    console.log(
      "Admin Token Balance after:",
      fromTokenAmount(await getBalance(adminWallet, TOKEN_MINT), TOKEN_DECIMALS)
    );
    console.log(`User bought ${tokenAmount} Tokens for ${usdtAmount} USDT`);
    
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error during buyTokens transaction:", error.message);
    } else {
      console.error("An unknown error occurred during buyTokens transaction:", error);
    }
    throw error; // Re-throw the error so it can be caught by the caller
  }
}

export async function sellTokens(userPrivateKey: string, tokenAmount: number): Promise<boolean> {
  try {
    if (tokenAmount <= 0) {
      throw new Error("Token amount must be greater than 0.");
    }
    if (!userPrivateKey) {
      throw new Error("User private key is required.");
    }
    const user = getUserKeypair(userPrivateKey);

    // Check SOL balance
    const balance = await connection.getBalance(user.publicKey);
    console.log("Balance: ", balance);

    if (balance < 1e7) {
      throw new Error("User does not have enough Lamports.");
    }
    
    // Get or create associated token accounts
    const userUSDTAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminWallet,
      USDT_MINT,
      user.publicKey
    );
    const adminUSDTAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminWallet,
      USDT_MINT,
      adminWallet.publicKey
    );
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminWallet,
      TOKEN_MINT,
      user.publicKey
    );
    const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminWallet,
      TOKEN_MINT,
      adminWallet.publicKey
    );

    // here we are taking 1 usdt = 1 token so
    const usdtAmount = tokenAmount;

    // Convert user-friendly amounts to on-chain amounts with decimals
    const onChainUsdtAmount = toTokenAmount(usdtAmount, USDT_DECIMALS);
    const onChainTokenAmount = toTokenAmount(tokenAmount, TOKEN_DECIMALS);

    // Check balances
    const userTokenBalance = await getBalance(user, TOKEN_MINT);
    console.log("User Token Balance: ", userTokenBalance);
    console.log("Token Amount to sell (on-chain): ", onChainTokenAmount);
    if (userTokenBalance < onChainTokenAmount)
      throw new Error("User does not have enough tokens.");

    const adminUSDTBalance = await getBalance(adminWallet, USDT_MINT);
    if (adminUSDTBalance < onChainUsdtAmount)
      throw new Error("Admin does not have enough USDT.");

    console.log(
      "User USDT Balance before selling:",
      fromTokenAmount(await getBalance(user, USDT_MINT), USDT_DECIMALS)
    );
    console.log(
      "User Token Balance before selling:",
      fromTokenAmount(await getBalance(user, TOKEN_MINT), TOKEN_DECIMALS)
    );
    console.log(
      "Admin USDT Balance before selling:",
      fromTokenAmount(await getBalance(adminWallet, USDT_MINT), USDT_DECIMALS)
    );
    console.log(
      "Admin Token Balance before selling:",
      fromTokenAmount(await getBalance(adminWallet, TOKEN_MINT), TOKEN_DECIMALS)
    );

    // Create transaction
    let transaction = new Transaction();
    
    // Transfer tokens from user to admin
    transaction.add(
      createTransferInstruction(
        userTokenAccount.address,
        adminTokenAccount.address,
        user.publicKey,
        onChainTokenAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );
    
    // Transfer USDT from admin to user
    transaction.add(
      createTransferInstruction(
        adminUSDTAccount.address,
        userUSDTAccount.address,
        adminWallet.publicKey,
        onChainUsdtAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Sign and send transaction
    await sendAndConfirmTransaction(connection, transaction, [user, adminWallet]);

    console.log(
      "User USDT Balance after selling:",
      fromTokenAmount(await getBalance(user, USDT_MINT), USDT_DECIMALS)
    );
    console.log(
      "User Token Balance after selling:",
      fromTokenAmount(await getBalance(user, TOKEN_MINT), TOKEN_DECIMALS)
    );
    console.log(
      "Admin USDT Balance after selling:",
      fromTokenAmount(await getBalance(adminWallet, USDT_MINT), USDT_DECIMALS)
    );
    console.log(
      "Admin Token Balance after selling:",
      fromTokenAmount(await getBalance(adminWallet, TOKEN_MINT), TOKEN_DECIMALS)
    );
    console.log(`User sold ${tokenAmount} Tokens for ${usdtAmount} USDT`);
    
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error during sellTokens transaction:", error.message);
    } else {
      console.error("An unknown error occurred during sellTokens transaction:", error);
    }
    throw error; // Re-throw the error so it can be caught by the caller
  }
}

// Export mint function for external use
export async function mintUSDT(userPrivateKey: string, amount: number): Promise<boolean> {
  try {
    const user = getUserKeypair(userPrivateKey);
    await mintTokens(USDT_MINT, user, amount, USDT_DECIMALS);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error minting USDT:", error.message);
    } else {
      console.error("An unknown error occurred while minting USDT:", error);
    }
    throw error;
  }
}

// Export mint function for external use
export async function mintCustomToken(userPrivateKey: string, amount: number): Promise<boolean> {
  try {
    const user = getUserKeypair(userPrivateKey);
    await mintTokens(TOKEN_MINT, user, amount, TOKEN_DECIMALS);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error minting custom token:", error.message);
    } else {
      console.error("An unknown error occurred while minting custom token:", error);
    }
    // Check if it's a SendTransactionError to get logs
    if (error instanceof SendTransactionError) {
      console.error("SendTransactionError during token transfer:", error.message);
      // Attempt to get logs, though they might be empty on simulation failure
      const logs = error.logs; // Access the logs property
      console.error("Transaction Logs:", logs);
    } else if (error instanceof Error) {
      console.error("Error during token transfer:", error.message);
    } else {
      console.error("An unknown error occurred during token transfer:", error);
    }
    throw error; // Re-throw the error
  }
}

/**
 * Transfer tokens between users or to/from the casino
 * @param {string} fromPrivateKey - Private key of the sender (or 'casino' for casino transfers)
 * @param {string} toPrivateKey - Private key of the recipient (or 'casino' for casino transfers)
 * @param {number} amount - Amount of tokens to transfer
 * @returns {Promise<boolean>} - True if successful
 */
export async function transferTokens(
  fromPrivateKey: string, 
  toPrivateKey: string, 
  amount: number
): Promise<boolean> {
  try {
    if (amount <= 0) {
      throw new Error("Transfer amount must be greater than 0.");
    }
    
    // Handle casino as a special case (using admin wallet)
    const fromWallet = fromPrivateKey === 'casino' ? adminWallet : getUserKeypair(fromPrivateKey);
    const toWallet = toPrivateKey === 'casino' ? adminWallet : getUserKeypair(toPrivateKey);
    
    // Get or create associated token accounts
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminWallet,
      TOKEN_MINT,
      fromWallet.publicKey
    );
    
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminWallet,
      TOKEN_MINT,
      toWallet.publicKey
    );

    // Add a small delay to allow devnet state to potentially settle
    await sleep(500); 
    
    // Convert user-friendly amount to on-chain amount with decimals
    const onChainAmount = toTokenAmount(amount, TOKEN_DECIMALS);
    
    // Check sender's token balance
    const fromTokenBalance = await getBalance(fromWallet, TOKEN_MINT);
    if (fromTokenBalance < onChainAmount) {
      throw new Error("Sender does not have enough tokens.");
    }
    
    // Create transaction
    let transaction = new Transaction();
    
    // Transfer Tokens from sender to recipient
    transaction.add(
      createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        fromWallet.publicKey,
        onChainAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Set the admin wallet as the fee payer for all transfers
    transaction.feePayer = adminWallet.publicKey;
    
    // Determine which wallets need to sign the transaction
    let signers = [adminWallet]; // Admin (as fee payer) must always sign
    
    // If the sender is a user (not the casino), they must also sign to authorize the transfer
    if (fromPrivateKey !== 'casino') {
      // Ensure the user wallet is added only if it's different from the admin wallet
      if (fromWallet.publicKey.toBase58() !== adminWallet.publicKey.toBase58()) {
         signers.push(fromWallet);
      }
    }
    
    // If the recipient is not the casino and not the same as the sender, they might need to sign too
    // But in most token transfers, only the sender needs to sign
    if (toPrivateKey !== 'casino' && fromPrivateKey !== toPrivateKey) {
      // In this case, we don't actually need the recipient to sign for a token transfer
      // This is just here for clarity
    }
    
    // Log the transaction details for debugging
    console.log(`Transferring ${amount} tokens (${onChainAmount} raw units) from ${fromWallet.publicKey.toBase58()} to ${toWallet.publicKey.toBase58()}`);
    console.log(`Number of signers: ${signers.length}`);
    console.log(`Attempting transfer: From Balance (raw): ${fromTokenBalance}, Amount (raw): ${onChainAmount}`);

    // Explicitly simulate the transaction first
    console.log("Simulating transaction...");
    const simulationResult = await connection.simulateTransaction(transaction, signers);
    console.log("Simulation Result:", JSON.stringify(simulationResult, null, 2)); // Log full simulation result

    if (simulationResult.value.err) {
      console.error("Transaction simulation failed:", simulationResult.value.err);
      console.error("Simulation Logs:", simulationResult.value.logs);
      throw new Error(`Transaction simulation failed: ${simulationResult.value.err}. Logs: ${simulationResult.value.logs?.join('\n')}`);
    } else {
       console.log("Transaction simulation successful. Logs:", simulationResult.value.logs);
    }

    // If simulation passed, send and confirm the transaction
    console.log("Sending and confirming transaction...");
    const signature = await sendAndConfirmTransaction(connection, transaction, signers, {
        skipPreflight: true, // Optional: Skip the automatic preflight simulation by sendAndConfirmTransaction as we already did it.
        commitment: 'confirmed',
    });
    console.log(`Transaction confirmed: ${signature}`);

    console.log(`Successfully transferred ${amount} tokens from ${fromWallet.publicKey.toBase58()} to ${toWallet.publicKey.toBase58()}`);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error during token transfer:", error.message);
    } else {
      console.error("An unknown error occurred during token transfer:", error);
    }
    throw error;
  }
}

// Generate a new wallet keypair
export function generateWallet(): { publicKey: string; privateKey: string } {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKey: bs58.encode(keypair.secretKey)
  };
}

export async function airdropSol(publicKey: PublicKey, amount: number) {
  try {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const signature = await connection.requestAirdrop(
      publicKey,
      amount * 1e9 // Convert SOL to lamports
    );
    await connection.confirmTransaction(signature);
    return true;
  } catch (error) {
    console.error('Airdrop failed:', error);
    return false;
  }
}
