import crypto from 'crypto';
import Wallet, { IWallet } from '../models/Wallet';
import User from '../models/User';
import mongoose from 'mongoose';
import { 
  generateWallet, 
  getUserKeypair, 
  getWalletBalance, 
  buyTokens, 
  sellTokens, 
  transferTokens,
  mintUSDT,
  mintCustomToken
} from '../utils/solanaTokens';

// Encryption settings
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY_RAW = process.env.WALLET_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
// Create a 32-byte key using a key derivation function
const ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY_RAW).digest();

/**
 * Encrypts a private key for secure storage
 * @param privateKey - The private key to encrypt
 * @returns The encrypted private key and initialization vector
 */
function encryptPrivateKey(privateKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ENCRYPTION_ALGORITHM, 
    Buffer.from(ENCRYPTION_KEY), 
    iv
  );
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Store IV and auth tag with the encrypted data
  return JSON.stringify({
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  });
}

/**
 * Decrypts a stored private key
 * @param encryptedData - The encrypted private key data
 * @returns The decrypted private key
 */
function decryptPrivateKey(encryptedData: string): string {
  const { iv, encryptedData: encrypted, authTag } = JSON.parse(encryptedData);
  
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM, 
    Buffer.from(ENCRYPTION_KEY), 
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Creates a new wallet for a user
 * @param userId - The MongoDB user ID
 * @returns The created wallet document
 */
export async function createUserWallet(userId: string): Promise<IWallet> {
  try {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if user already has a wallet
    const existingWallet = await Wallet.findOne({ userId });
    if (existingWallet) {
      return existingWallet;
    }
    
    // Generate a new Solana wallet
    const { publicKey, privateKey } = generateWallet();
    
    // Encrypt the private key for storage
    const encryptedPrivateKey = encryptPrivateKey(privateKey);
    
    // Create wallet record in database
    const wallet = new Wallet({
      userId,
      publicKey,
      encryptedPrivateKey,
      balance: {
        sol: 0,
        token: 0,
        usdt: 0
      },
      transactions: []
    });
    
    await wallet.save();
    
    return wallet;
  } catch (error) {
    console.error('Error creating user wallet:', error);
    throw error;
  }
}

/**
 * Gets a user's wallet
 * @param userId - The MongoDB user ID
 * @returns The user's wallet or null if not found
 */
export async function getUserWallet(userId: string): Promise<IWallet | null> {
  return await Wallet.findOne({ userId });
}

/**
 * Gets the private key for a wallet (decrypted)
 * @param wallet - The wallet document
 * @returns The decrypted private key
 */
export function getWalletPrivateKey(wallet: IWallet): string {
  return decryptPrivateKey(wallet.encryptedPrivateKey);
}

/**
 * Updates wallet balances from the blockchain
 * @param userId - The MongoDB user ID
 * @returns Updated wallet with current balances
 */
export async function updateWalletBalances(userId: string): Promise<IWallet | null> {
  try {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    
    const privateKey = getWalletPrivateKey(wallet);
    const keypair = getUserKeypair(privateKey);
    
    // Get on-chain balances
    const { solBalance, tokenBalance, usdtBalance } = await getWalletBalance(keypair);
    
    // Update wallet in database
    wallet.balance.sol = solBalance;
    wallet.balance.token = tokenBalance;
    wallet.balance.usdt = usdtBalance;
    
    await wallet.save();
    
    return wallet;
  } catch (error) {
    console.error('Error updating wallet balances:', error);
    throw error;
  }
}

/**
 * Records a transaction in the wallet's transaction history
 * @param userId - The MongoDB user ID
 * @param type - Transaction type
 * @param amount - Transaction amount
 * @param tokenType - Type of token used
 * @param txHash - Optional blockchain transaction hash
 * @param gameId - Optional game ID for game-related transactions
 */
export async function recordTransaction(
  userId: string,
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'loss',
  amount: number,
  tokenType: 'sol' | 'token' | 'usdt',
  txHash?: string,
  gameId?: string
): Promise<void> {
  try {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    
    wallet.transactions.push({
      type,
      amount,
      tokenType,
      timestamp: new Date(),
      txHash,
      gameId
    });
    
    await wallet.save();
  } catch (error) {
    console.error('Error recording transaction:', error);
    throw error;
  }
}

/**
 * Transfers tokens between users or to/from the casino
 * @param fromUserId - Sender's MongoDB user ID (or 'casino')
 * @param toUserId - Recipient's MongoDB user ID (or 'casino')
 * @param amount - Amount to transfer
 * @param gameId - Optional game ID for game-related transfers
 * @returns Success status
 */
export async function transferTokensBetweenUsers(
  fromUserId: string, 
  toUserId: string, 
  amount: number,
  gameId?: string
): Promise<boolean> {
  try {
    let fromPrivateKey: string;
    let toPrivateKey: string;
    
    // Handle casino as special case
    if (fromUserId === 'casino') {
      fromPrivateKey = 'casino';
    } else {
      const fromWallet = await Wallet.findOne({ userId: fromUserId });
      if (!fromWallet) {
        throw new Error('Sender wallet not found');
      }
      fromPrivateKey = getWalletPrivateKey(fromWallet);
    }
    
    if (toUserId === 'casino') {
      toPrivateKey = 'casino';
    } else {
      const toWallet = await Wallet.findOne({ userId: toUserId });
      if (!toWallet) {
        throw new Error('Recipient wallet not found');
      }
      toPrivateKey = getWalletPrivateKey(toWallet);
    }
    
    // Execute the transfer
    const success = await transferTokens(fromPrivateKey, toPrivateKey, amount);
    
    if (success) {
      // Update balances and record transactions for both users
      if (fromUserId !== 'casino') {
        await updateWalletBalances(fromUserId);
        await recordTransaction(fromUserId, 'withdrawal', amount, 'token', undefined, gameId);
      }
      
      if (toUserId !== 'casino') {
        await updateWalletBalances(toUserId);
        await recordTransaction(toUserId, 'deposit', amount, 'token', undefined, gameId);
      }
    }
    
    return success;
  } catch (error) {
    console.error('Error transferring tokens:', error);
    throw error;
  }
}

/**
 * Places a bet from a user to the casino
 * @param userId - The MongoDB user ID
 * @param amount - Bet amount
 * @param gameId - Game identifier
 * @returns Success status
 */
export async function placeBet(userId: string, amount: number, gameId: string): Promise<boolean> {
  try {
    return await transferTokensBetweenUsers(userId, 'casino', amount, gameId);
  } catch (error) {
    console.error('Error placing bet:', error);
    throw error;
  }
}

/**
 * Pays out winnings from the casino to a user
 * @param userId - The MongoDB user ID
 * @param amount - Winnings amount
 * @param gameId - Game identifier
 * @returns Success status
 */
export async function payoutWinnings(userId: string, amount: number, gameId: string): Promise<boolean> {
  try {
    const success = await transferTokensBetweenUsers('casino', userId, amount, gameId);
    
    if (success) {
      // Record as a win specifically
      const wallet = await Wallet.findOne({ userId });
      if (wallet) {
        wallet.transactions.push({
          type: 'win',
          amount,
          tokenType: 'token',
          timestamp: new Date(),
          gameId
        });
        await wallet.save();
      }
    }
    
    return success;
  } catch (error) {
    console.error('Error paying out winnings:', error);
    throw error;
  }
}

/**
 * For development/testing: Mints USDT to a user's wallet
 * @param userId - The MongoDB user ID
 * @param amount - Amount to mint
 * @returns Success status
 */
export async function mintTestUSDT(userId: string, amount: number): Promise<boolean> {
  try {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    
    const privateKey = getWalletPrivateKey(wallet);
    
    // Mint USDT to the user's wallet
    const success = await mintUSDT(privateKey, amount);
    
    if (success) {
      // Update balances
      await updateWalletBalances(userId);
    }
    
    return success;
  } catch (error) {
    console.error('Error minting test USDT:', error);
    throw error;
  }
}

/**
 * For development/testing: Mints custom tokens to a user's wallet
 * @param userId - The MongoDB user ID
 * @param amount - Amount to mint
 * @returns Success status
 */
export async function mintTestTokens(userId: string, amount: number): Promise<boolean> {
  try {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    
    const privateKey = getWalletPrivateKey(wallet);
    
    // Mint tokens to the user's wallet
    const success = await mintCustomToken(privateKey, amount);
    
    if (success) {
      // Update balances
      await updateWalletBalances(userId);
    }
    
    return success;
  } catch (error) {
    console.error('Error minting test tokens:', error);
    throw error;
  }
}
